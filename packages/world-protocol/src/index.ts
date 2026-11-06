import { sha256, stringToHex } from "viem";
import { cellKey, hasSafeRoute, samePoint, validateMap, type Kind, type Role, type VenueMap } from "./venue";
export * from "./venue";

export const PROTOCOL = "riftrun-v1";
export const ADDRESS = /^0x[0-9a-f]{40}$/i;
export const ENTITY_KEY = /^0x[0-9a-f]{64}$/i;
export type Metadata = {
  key: string; creator: string; owner: string; createdAt: bigint; updatedAt: bigint; expiresAt: bigint;
  readonly: boolean; permissionlessExtension: boolean;
};
export type RoundConfig = { startBlock: bigint; endBlock: bigint; phaseBlocks: bigint; lifetimeBlocks: bigint; activeCap: number };
export type Manifest = Metadata & { worldId: string; roundId: string; map: VenueMap; mapHash: string; config: RoundConfig; memberKeys: string[]; protocol: string };
export type Member = Metadata & { worldId: string; roundId: string; player: string; role: Role; maxActive: number };
export type WorldOp = Metadata & { worldId: string; roundId: string; phase: number; x: number; y: number; kind: Kind };
export type Trust = { manifestKey: string; host: string; worldId: string };
export type Cell = { x: number; y: number; kind: Kind; entityKey: string; creator: string; phase: number; expiresAt: string };
export type Rejection = { key: string; reason: string };
export type WorldState = {
  protocol: string; worldId: string; roundId: string; block: string; phase: number; cells: Cell[];
  accepted: string[]; rejected: Rejection[]; inputHash: string; worldHash: string;
};
export function canonical(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (typeof v === "bigint") return v.toString(10);
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, item]) => [k, normalize(item)]));
    if (typeof v === "number" && !Number.isFinite(v)) throw new Error("Non-finite number in canonical state");
    if (v === undefined) throw new Error("Undefined value in canonical state");
    return v;
  };
  return JSON.stringify(normalize(value));
}
export function digest(value: unknown): string { return sha256(stringToHex(canonical(value))); }
export function lower(value: string): string { return value.toLowerCase(); }
export function mergeOperationSets(...sets: WorldOp[][]): WorldOp[] {
  // Preserve conflicting variants so reconciliation can reject them consistently.
  const records = new Map(sets.flat().map(op => [canonical(op), op]));
  return [...records].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, op]) => op);
}
function compare(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
export function phaseAt(config: RoundConfig, block: bigint): number { return block < config.startBlock ? -1 : Number((block - config.startBlock) / config.phaseBlocks); }
export function effectiveExpiry(op: WorldOp, config: RoundConfig): bigint {
  return [op.expiresAt, op.createdAt + config.lifetimeBlocks, config.endBlock].reduce((a, b) => a < b ? a : b);
}
function validMeta(m: Metadata): boolean {
  return ENTITY_KEY.test(m.key) && ADDRESS.test(m.creator) && ADDRESS.test(m.owner)
    && m.createdAt >= 0n && m.updatedAt === m.createdAt && m.expiresAt > m.createdAt && m.readonly && !m.permissionlessExtension;
}
export function validateManifest(m: Manifest, trust: Trust, block: bigint): void {
  if (!validMeta(m) || lower(m.key) !== lower(trust.manifestKey) || lower(m.creator) !== lower(trust.host) || lower(m.owner) !== lower(trust.host)) throw new Error("Untrusted manifest provenance");
  if (m.worldId !== trust.worldId || m.protocol !== PROTOCOL || !m.roundId || m.roundId.length > 96 || !validateMap(m.map) || digest(m.map) !== m.mapHash) throw new Error("Invalid manifest map or protocol");
  const c = m.config;
  if (m.expiresAt <= block || c.phaseBlocks < 1n || c.phaseBlocks > 60n || c.lifetimeBlocks < 1n || c.lifetimeBlocks > 60n || c.endBlock <= c.startBlock || c.endBlock - c.startBlock > 600n || c.startBlock < m.createdAt || !Number.isInteger(c.activeCap) || c.activeCap < 1 || c.activeCap > 3) throw new Error("Invalid or expired round configuration");
  if (m.memberKeys.length < 1 || m.memberKeys.length > 16 || !m.memberKeys.every(k => ENTITY_KEY.test(k)) || new Set(m.memberKeys.map(lower)).size !== m.memberKeys.length) throw new Error("Invalid pinned membership keys");
}

export function reconcileWorld(manifest: Manifest, members: Member[], operations: WorldOp[], block: bigint, trust: Trust): WorldState {
  validateManifest(manifest, trust, block);
  const rejected: Rejection[] = [];
  const reject = (key: string, reason: string) => rejected.push({ key: lower(key), reason });
  const normalizedMembers = members.map(m => ({ ...m, key: lower(m.key), owner: lower(m.owner), creator: lower(m.creator), player: lower(m.player) }));
  const authorized = new Map<string, Member>();
  for (const key of manifest.memberKeys.map(lower).sort(compare)) {
    const matches = normalizedMembers.filter(m => m.key === key);
    const member = matches[0];
    if (!member || matches.some(m => canonical(m) !== canonical(member))) throw new Error("Pinned membership missing or inconsistent");
    if (!validMeta(member) || member.creator !== lower(trust.host) || member.owner !== lower(trust.host) || member.worldId !== manifest.worldId || member.roundId !== manifest.roundId || !ADDRESS.test(member.player) || !["BUILDER", "BREAKER"].includes(member.role) || !Number.isInteger(member.maxActive) || member.maxActive < 1 || member.maxActive > manifest.config.activeCap || member.expiresAt < manifest.config.endBlock || member.createdAt > manifest.config.startBlock) throw new Error("Invalid pinned membership");
    if (authorized.has(member.player)) throw new Error("Ambiguous membership for wallet");
    authorized.set(member.player, member);
  }
  const variants = new Map<string, WorldOp[]>();
  for (const record of operations) {
    const op = { ...record, key: lower(record.key), creator: lower(record.creator), owner: lower(record.owner) };
    variants.set(op.key, [...(variants.get(op.key) ?? []), op]);
  }
  const unique: WorldOp[] = [];
  for (const [key, records] of [...variants].sort(([a], [b]) => compare(a, b))) {
    if (records.some(r => canonical(r) !== canonical(records[0]))) { reject(key, "inconsistent duplicate"); continue; }
    unique.push(records[0]);
  }
  const valid: WorldOp[] = [];
  for (const op of unique) {
    const member = authorized.get(op.creator);
    const site = manifest.map.sites.find(s => samePoint(s, op) && s.kind === op.kind);
    let reason = "";
    if (!validMeta(op) || op.creator !== op.owner) reason = "invalid provenance or mutable entity";
    else if (op.worldId !== manifest.worldId || op.roundId !== manifest.roundId) reason = "wrong world or round";
    else if (!member || member.expiresAt <= block) reason = "unauthorized creator";
    else if (op.createdAt < member.createdAt || op.createdAt < manifest.config.startBlock || op.createdAt >= manifest.config.endBlock || op.createdAt > block) reason = "out-of-round creation block";
    else if (!Number.isInteger(op.phase) || op.phase !== phaseAt(manifest.config, op.createdAt)) reason = "forged phase";
    else if (effectiveExpiry(op, manifest.config) <= block) reason = "expired";
    else if (!Number.isInteger(op.x) || !Number.isInteger(op.y) || !site) reason = "illegal edit site";
    else if ((member.role === "BUILDER" && op.kind !== "BRIDGE") || (member.role === "BREAKER" && op.kind !== "WALL")) reason = "role mismatch";
    if (reason) reject(op.key, reason); else valid.push(op);
  }
  const counts = new Map<string, number>(); const budgeted: WorldOp[] = [];
  for (const op of valid.sort((a, b) => compare(a.key, b.key))) {
    const count = counts.get(op.creator) ?? 0;
    if (count >= authorized.get(op.creator)!.maxActive) { reject(op.key, "active operation cap"); continue; }
    counts.set(op.creator, count + 1); budgeted.push(op);
  }
  const groups = new Map<string, WorldOp[]>();
  for (const op of budgeted) groups.set(cellKey(op), [...(groups.get(cellKey(op)) ?? []), op]);
  const winners: WorldOp[] = [];
  for (const [, group] of [...groups].sort(([a], [b]) => compare(a, b))) {
    const rank = (op: WorldOp) => digest([PROTOCOL, manifest.worldId, manifest.roundId, op.phase, op.key]);
    group.sort((a, b) => b.phase - a.phase || compare(rank(a), rank(b)) || compare(a.key, b.key));
    winners.push(group[0]);
    for (const loser of group.slice(1)) reject(loser.key, "conflict lost");
  }
  let cells: Cell[] = winners.map(op => ({ x: op.x, y: op.y, kind: op.kind, entityKey: op.key, creator: op.creator, phase: op.phase, expiresAt: effectiveExpiry(op, manifest.config).toString() })).sort((a, b) => a.y - b.y || a.x - b.x);
  if (!hasSafeRoute(manifest.map, cells)) {
    for (const cell of cells.filter(c => c.kind === "WALL")) reject(cell.entityKey, "would block safe route");
    cells = cells.filter(c => c.kind !== "WALL");
  }
  const inputHash = digest({ protocol: PROTOCOL, manifest, members: [...authorized.values()].sort((a, b) => compare(a.key, b.key)), operations: unique, block });
  const world = { protocol: PROTOCOL, worldId: manifest.worldId, roundId: manifest.roundId, mapHash: manifest.mapHash, config: manifest.config, cells };
  return { protocol: PROTOCOL, worldId: manifest.worldId, roundId: manifest.roundId, block: block.toString(), phase: phaseAt(manifest.config, block), cells, accepted: cells.map(c => c.entityKey), rejected: rejected.sort((a, b) => compare(a.key, b.key) || compare(a.reason, b.reason)), inputHash, worldHash: digest(world) };
}

export function practiceSession(): { manifest: Manifest; members: Member[]; trust: Trust } {
  // This fixture is only used by the visibly labeled SIMULATED practice mode.
  const host = `0x${"a".repeat(40)}`; const key = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
  const meta = (n: number, creator = host): Metadata => ({ key: key(n), creator, owner: creator, createdAt: 0n, updatedAt: 0n, expiresAt: 10000n, readonly: true, permissionlessExtension: false });
  const players = [`0x${"b".repeat(40)}`, `0x${"c".repeat(40)}`, `0x${"d".repeat(40)}`];
  const members: Member[] = players.map((player, i) => ({ ...meta(i + 2), worldId: "practice", roundId: "practice-round", player, role: i === 2 ? "BREAKER" : "BUILDER", maxActive: 2 }));
  const manifest: Manifest = { ...meta(1), worldId: "practice", roundId: "practice-round", protocol: PROTOCOL, map: VENUE, mapHash: digest(VENUE), config: { startBlock: 0n, endBlock: 60n, phaseBlocks: 5n, lifetimeBlocks: 15n, activeCap: 2 }, memberKeys: members.map(m => m.key) };
  return { manifest, members, trust: { manifestKey: manifest.key, host, worldId: manifest.worldId } };
}
import { VENUE } from "./venue";
