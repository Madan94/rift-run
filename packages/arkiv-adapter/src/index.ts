import {
  createPublicClient,
  createWalletClient,
  ExpirationTime,
} from "@arkiv-network/sdk";
import {
  addr,
  bytes,
  defineSchema,
  i32,
  key,
  str,
  u64,
} from "@arkiv-network/sdk/schema";
import { and, asc, eq, gt, or } from "@arkiv-network/sdk/query";
import { rabdi } from "@arkiv-network/sdk/chains";
import {
  custom,
  hexToString,
  http,
  stringToBytes,
  type Account,
  type EIP1193Provider,
  type Hex,
} from "viem";
import {
  ADDRESS,
  ENTITY_KEY,
  PROTOCOL,
  canonical,
  digest,
  lower,
  phaseAt,
  reconcileWorld,
  selectRoster,
  validateLobby,
  validateManifest,
  validateMap,
  VENUE,
  type Kind,
  type Lobby,
  type Manifest,
  type Member,
  type Metadata,
  type Role,
  type Trust,
  type VenueMap,
  type WorldOp,
  type WorldState,
} from "@riftrun/world-protocol";

export const CHAIN_ID = 7794095;
export const RPC_URL = "https://rpc.rabdi.db-chain.testnet.arkiv.network";
export const EXPLORER = "https://rabdi.explorer.arkiv.network";
export const LobbySchema = defineSchema("riftrun.lobby.v2", {
  worldId: str().indexed(),
  roundId: str().indexed(),
  protocol: str(),
  capacity: i32(),
  mapHash: str(),
  baseMap: bytes(),
});
export const WorldSchema = defineSchema("riftrun.world.v2", {
  worldId: str().indexed(),
  roundId: str().indexed(),
  protocol: str(),
  mapHash: str(),
  baseMap: bytes(),
  lobbyKey: str().indexed(),
  startBlock: u64(),
  endBlock: u64(),
  phaseBlocks: u64(),
  lifetimeBlocks: u64(),
  activeCap: i32(),
  memberKeys: bytes(),
});
export const MemberSchema = defineSchema("riftrun.member.v2", {
  worldId: str().indexed(),
  roundId: str().indexed(),
  lobbyKey: str().indexed(),
  player: addr().indexed(),
  role: str().indexed(),
  maxActive: i32(),
});
export const OpSchema = defineSchema("riftrun.world-ops.v2", {
  worldId: str().indexed(),
  roundId: str().indexed(),
  phase: i32().indexed(),
  x: i32().indexed(),
  y: i32().indexed(),
  kind: str().indexed(),
});
const systemSelection = {
  $key: true,
  $creator: true,
  $owner: true,
  $createdAt: true,
  $updatedAt: true,
  $expiresAt: true,
  $creationFlags: true,
} as const;
type SystemRow = {
  $key: Hex;
  $creator: Hex;
  $owner: Hex;
  $createdAt: bigint;
  $updatedAt: bigint;
  $expiresAt: bigint;
  $creationFlags: { readonly: boolean; permissionlessExtension: boolean };
};
const meta = (row: SystemRow): Metadata => ({
  key: lower(row.$key),
  creator: lower(row.$creator),
  owner: lower(row.$owner),
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  expiresAt: row.$expiresAt,
  readonly: row.$creationFlags.readonly,
  permissionlessExtension: row.$creationFlags.permissionlessExtension,
});

export function createReader(accessKey = "", rpcUrl?: string) {
  return createPublicClient({
    chain: rabdi({ accessKey }),
    transport: rpcUrl
      ? http(rpcUrl, { timeout: 12000, retryCount: 1 })
      : http(undefined, { timeout: 12000, retryCount: 1 }),
  });
}
export type Reader = ReturnType<typeof createReader>;
export function createScriptWriter(
  account: Account,
  accessKey = "",
  rpcUrl?: string,
) {
  return createWalletClient({
    account,
    chain: rabdi({ accessKey }),
    transport: rpcUrl ? http(rpcUrl) : http(),
  });
}
export function createBrowserWriter(provider: EIP1193Provider, account: Hex) {
  // Never place an access-key-bearing RPC URL in a visitor's wallet network configuration.
  return createWalletClient({
    account,
    chain: rabdi({ accessKey: "" }),
    transport: custom(provider),
  });
}
export async function connectBrowser(provider: EIP1193Provider): Promise<Hex> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts[0] || !ADDRESS.test(accounts[0]))
    throw new Error("No wallet account selected");
  const chainId = await provider.request({ method: "eth_chainId" });
  if (Number(chainId) !== CHAIN_ID) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 4902)
        throw new Error("Switch your wallet to Arkiv Rabdi to publish");
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: "Arkiv Rabdi",
            nativeCurrency: { name: "Test GLM", symbol: "tGLM", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    }
  }
  const selected = await provider.request({ method: "eth_accounts" });
  if (!selected[0] || !ADDRESS.test(selected[0]))
    throw new Error("Wallet account changed during connection; reconnect");
  return selected[0];
}

function json(hex: Hex): unknown {
  if (hex.length > 32770) throw new Error("Oversized protocol payload");
  return JSON.parse(hexToString(hex));
}
export async function readManifest(
  reader: Reader,
  trust: Trust,
): Promise<Manifest> {
  if (
    !ENTITY_KEY.test(trust.manifestKey) ||
    !ADDRESS.test(trust.host) ||
    !trust.worldId
  )
    throw new Error(
      "A world ID, manifest key and host address must all be configured",
    );
  const row = await reader.getEntity(trust.manifestKey as Hex, WorldSchema);
  const map = json(row.baseMap.value);
  const memberKeys = json(row.memberKeys.value);
  if (
    !validateMap(map) ||
    !Array.isArray(memberKeys) ||
    !memberKeys.every((k) => typeof k === "string" && ENTITY_KEY.test(k))
  )
    throw new Error("Malformed manifest map or membership pins");
  return {
    ...meta(row),
    worldId: row.worldId.value,
    roundId: row.roundId.value,
    lobbyKey: lower(row.lobbyKey.value),
    protocol: row.protocol.value,
    mapHash: row.mapHash.value,
    map,
    memberKeys: memberKeys.map(lower),
    config: {
      startBlock: row.startBlock.value,
      endBlock: row.endBlock.value,
      phaseBlocks: row.phaseBlocks.value,
      lifetimeBlocks: row.lifetimeBlocks.value,
      activeCap: row.activeCap.value,
    },
  };
}
export async function readMembers(
  reader: Reader,
  manifest: Manifest,
): Promise<Member[]> {
  return Promise.all(
    manifest.memberKeys.map(async (entityKey) => {
      const row = await reader.getEntity(entityKey as Hex, MemberSchema);
      if (row.role.value !== "BUILDER" && row.role.value !== "BREAKER")
        throw new Error("Invalid member role");
      return {
        ...meta(row),
        worldId: row.worldId.value,
        roundId: row.roundId.value,
        lobbyKey: lower(row.lobbyKey.value),
        player: lower(row.player.value),
        role: row.role.value,
        maxActive: row.maxActive.value,
      };
    }),
  );
}
export type Page<T> = { rows: T[]; blockNumber: bigint; skipped: number };
export async function collectPages<T extends { key: string }>(
  fetchPage: (lastKey: string | undefined) => Promise<Page<T>>,
  pageSize = 100,
): Promise<{ rows: T[]; blockNumber: bigint }> {
  const rows: T[] = [];
  let lastKey: string | undefined;
  let blockNumber: bigint | undefined;
  for (let page = 0; page < 12; page++) {
    const result = await fetchPage(lastKey);
    if (result.skipped)
      throw new Error(
        "Query schema mismatch: refresh or inspect conflicting records",
      );
    if (blockNumber !== undefined && blockNumber !== result.blockNumber)
      throw new Error(
        "Chain advanced during pagination; retry consistent scan",
      );
    blockNumber = result.blockNumber;
    if (
      result.rows.some(
        (r, i) =>
          !ENTITY_KEY.test(r.key) ||
          (i
            ? r.key <= result.rows[i - 1].key
            : lastKey !== undefined && r.key <= lastKey),
      )
    )
      throw new Error("Query did not return strictly ordered keys");
    rows.push(...result.rows);
    if (result.rows.length < pageSize) return { rows, blockNumber };
    lastKey = result.rows.at(-1)!.key;
  }
  throw new Error("World scan exceeded the bounded 1200-record limit");
}
export async function readOperations(
  reader: Reader,
  manifest: Manifest,
  members: Member[],
): Promise<{ rows: WorldOp[]; blockNumber: bigint }> {
  return collectPages(async (lastKey) => {
    const query = reader
      .select({
        ...systemSelection,
        worldId: true,
        roundId: true,
        phase: true,
        x: true,
        y: true,
        kind: true,
      })
      .from(OpSchema)
      .where(
        and(
          eq("worldId", manifest.worldId),
          eq("roundId", manifest.roundId),
          or(...members.map((m) => eq("$creator", addr(m.player as Hex)))),
          ...(lastKey ? [gt("$key", key(lastKey as Hex))] : []),
        ),
      )
      .orderBy(asc("$key"))
      .limit(100);
    const result = await query.fetch();
    const rows: WorldOp[] = result.entities.map((row) => ({
      ...meta(row),
      worldId: row.worldId.value,
      roundId: row.roundId.value,
      phase: row.phase.value,
      x: row.x.value,
      y: row.y.value,
      kind: row.kind.value as Kind,
    }));
    return { rows, blockNumber: result.blockNumber, skipped: result.skipped };
  });
}
export type Snapshot = {
  manifest: Manifest;
  members: Member[];
  operations: WorldOp[];
  state: WorldState;
  readAt: number;
};
export async function loadWorld(
  reader: Reader,
  trust: Trust,
): Promise<Snapshot> {
  const before = await reader.getBlockTiming();
  const manifest = await readManifest(reader, trust);
  validateManifest(manifest, trust, before.currentBlock);
  const lobby = await readLobby(reader, {
    ...trust,
    lobbyKey: manifest.lobbyKey,
  });
  validateLobby(
    lobby,
    { ...trust, lobbyKey: manifest.lobbyKey },
    before.currentBlock,
  );
  if (
    manifest.mapHash !== lobby.mapHash ||
    manifest.roundId !== lobby.roundId ||
    manifest.memberKeys.length > lobby.capacity
  )
    throw new Error("Round does not match its trusted lobby");
  const members = await readMembers(reader, manifest);
  const result = await readOperations(reader, manifest, members);
  const after = await reader.getBlockTiming();
  // Reads are latest-state, not atomic snapshots. Config/roster attributes are pinned and readonly;
  // ownership/expiry metadata is reread. Evaluate expiry at the observed head and expose input digest.
  if (
    after.currentBlock < result.blockNumber ||
    result.blockNumber < before.currentBlock - 3n
  )
    throw new Error("Indexer/head mismatch; waiting for fresh Arkiv data");
  return {
    manifest,
    members,
    operations: result.rows,
    state: reconcileWorld(
      manifest,
      members,
      result.rows,
      after.currentBlock,
      trust,
    ),
    readAt: Date.now(),
  };
}
export async function publishOperation(
  writer:
    | ReturnType<typeof createScriptWriter>
    | ReturnType<typeof createBrowserWriter>,
  reader: Reader,
  snapshot: Snapshot,
  actor: string,
  siteId: string,
) {
  const { manifest, members } = snapshot;
  const timing = await reader.getBlockTiming();
  const phase = phaseAt(manifest.config, timing.currentBlock);
  const member = members.find((m) => lower(m.player) === lower(actor));
  const site = manifest.map.sites.find((s) => s.id === siteId);
  if (
    !member ||
    !site ||
    (site.kind === "BRIDGE"
      ? member.role !== "BUILDER"
      : member.role !== "BREAKER")
  )
    throw new Error("This wallet is not authorized for that edit");
  if (phase < 0 || timing.currentBlock >= manifest.config.endBlock - 2n)
    throw new Error("Round is not open for edits");
  // A boundary-crossing transaction is rejected by all clients; no client-supplied phase is trusted.
  return writer.createEntity(
    OpSchema,
    {
      worldId: manifest.worldId,
      roundId: manifest.roundId,
      phase,
      x: site.x,
      y: site.y,
      kind: site.kind,
    },
    {
      expiration: ExpirationTime.fromBlocks(
        Number(manifest.config.lifetimeBlocks),
      ),
      flags: { readonly: true, permissionlessExtension: false },
    },
  );
}
export function manifestValues(
  worldId: string,
  roundId: string,
  map: VenueMap,
  memberKeys: string[],
  startBlock: bigint,
  lobbyKey: string,
) {
  return {
    worldId,
    roundId,
    lobbyKey: lower(lobbyKey),
    protocol: PROTOCOL,
    mapHash: digest(map),
    baseMap: stringToBytes(canonical(map)),
    memberKeys: stringToBytes(canonical(memberKeys.map(lower))),
    startBlock: u64(startBlock),
    endBlock: u64(startBlock + 60n),
    phaseBlocks: u64(5n),
    lifetimeBlocks: u64(15n),
    activeCap: 2,
  };
}
export function safeError(error: unknown): string {
  const msg =
    error instanceof Error ? error.message : "Unknown request failure";
  return msg
    .replace(/https?:\/\/[^\s)"']+/gi, "[RPC endpoint]")
    .replace(/0x[0-9a-f]{64}/gi, "[entity/transaction key]")
    .slice(0, 300);
}
export function runnableQuery(worldId: string, roundId: string): string {
  const quote = (value: string) => value.replaceAll("'", "''");
  return `arkiv.schema = str('riftrun.world-ops.v2') AND worldId = str('${quote(worldId)}') AND roundId = str('${quote(roundId)}') ORDER BY $key ASC`;
}

export type Writer =
  | ReturnType<typeof createScriptWriter>
  | ReturnType<typeof createBrowserWriter>;
export async function readLobby(reader: Reader, trust: Trust): Promise<Lobby> {
  if (!ENTITY_KEY.test(trust.lobbyKey ?? ""))
    throw new Error("A pinned lobby key is required");
  const row = await reader.getEntity(trust.lobbyKey as Hex, LobbySchema);
  const map = json(row.baseMap.value);
  if (!validateMap(map)) throw new Error("Invalid lobby map");
  return {
    ...meta(row),
    worldId: row.worldId.value,
    roundId: row.roundId.value,
    protocol: row.protocol.value,
    capacity: row.capacity.value,
    mapHash: row.mapHash.value,
    map,
  };
}
export async function readRegistrations(
  reader: Reader,
  lobby: Lobby,
): Promise<Member[]> {
  const result = await collectPages(async (lastKey) => {
    const page = await reader
      .select({
        ...systemSelection,
        worldId: true,
        roundId: true,
        lobbyKey: true,
        player: true,
        role: true,
        maxActive: true,
      })
      .from(MemberSchema)
      .where(
        and(
          eq("lobbyKey", lower(lobby.key)),
          eq("worldId", lobby.worldId),
          eq("roundId", lobby.roundId),
          ...(lastKey ? [gt("$key", key(lastKey as Hex))] : []),
        ),
      )
      .orderBy(asc("$key"))
      .limit(100)
      .fetch();
    return {
      rows: page.entities.map((row) => ({
        ...meta(row),
        worldId: row.worldId.value,
        roundId: row.roundId.value,
        lobbyKey: lower(row.lobbyKey.value),
        player: lower(row.player.value),
        role: row.role.value as Role,
        maxActive: row.maxActive.value,
      })),
      blockNumber: page.blockNumber,
      skipped: page.skipped,
    };
  });
  return result.rows;
}
async function discoverRound(
  reader: Reader,
  lobby: Lobby,
  host: string,
): Promise<string | undefined> {
  const page = await reader
    .select({ $key: true, $createdAt: true })
    .from(WorldSchema)
    .where(
      and(
        eq("worldId", lobby.worldId),
        eq("roundId", lobby.roundId),
        eq("lobbyKey", lower(lobby.key)),
        eq("$creator", addr(host as Hex)),
        eq("$owner", addr(host as Hex)),
      ),
    )
    .limit(100)
    .fetch();
  if (page.skipped || page.entities.length === 100)
    throw new Error("Ambiguous lobby round records");
  return [...page.entities].sort((a, b) =>
    a.$createdAt === b.$createdAt
      ? a.$key.localeCompare(b.$key)
      : a.$createdAt < b.$createdAt
        ? -1
        : 1,
  )[0]?.$key;
}
export type LobbySnapshot = {
  lobby: Lobby;
  registrations: Member[];
  roster: Member[];
  block: bigint;
  snapshot: Snapshot | null;
  readAt: number;
};
export async function loadLobbySession(
  reader: Reader,
  trust: Trust,
): Promise<LobbySnapshot> {
  const [lobby, timing] = await Promise.all([
    readLobby(reader, trust),
    reader.getBlockTiming(),
  ]);
  validateLobby(lobby, trust, timing.currentBlock);
  const [registrations, discovered] = await Promise.all([
    readRegistrations(reader, lobby),
    trust.manifestKey
      ? Promise.resolve(trust.manifestKey)
      : discoverRound(reader, lobby, trust.host),
  ]);
  const snapshot = discovered
    ? await loadWorld(reader, { ...trust, manifestKey: discovered })
    : null;
  return {
    lobby,
    registrations,
    roster:
      snapshot?.members ??
      selectRoster(lobby, registrations, timing.currentBlock),
    block: snapshot ? BigInt(snapshot.state.block) : timing.currentBlock,
    snapshot,
    readAt: Date.now(),
  };
}
export async function createLobby(writer: Writer) {
  const worldId = `mumbai-${Date.now().toString(36)}`;
  const roundId = `round-${Date.now().toString(36)}`;
  const result = await writer.createEntity(
    LobbySchema,
    {
      worldId,
      roundId,
      protocol: PROTOCOL,
      capacity: 16,
      mapHash: digest(VENUE),
      baseMap: stringToBytes(canonical(VENUE)),
    },
    { expiration: ExpirationTime.fromDays(7), flags: { readonly: true } },
  );
  return { ...result, worldId, roundId };
}
export async function registerParticipant(
  writer: Writer,
  reader: Reader,
  trust: Trust,
  actor: Hex,
  role: Role,
) {
  const session = await loadLobbySession(reader, trust);
  if (session.snapshot)
    throw new Error("Roster is locked for this round. Join the next lobby.");
  if (session.roster.some((m) => lower(m.player) === lower(actor)))
    throw new Error(
      "This wallet is already registered. Its first registration fixes the team.",
    );
  if (session.roster.length >= session.lobby.capacity)
    throw new Error("Lobby is full. Join the next round.");
  return writer.createEntity(
    MemberSchema,
    {
      worldId: session.lobby.worldId,
      roundId: session.lobby.roundId,
      lobbyKey: lower(session.lobby.key),
      player: addr(actor),
      role,
      maxActive: 2,
    },
    { expiration: ExpirationTime.fromDays(7), flags: { readonly: true } },
  );
}
export async function startRound(
  writer: Writer,
  reader: Reader,
  trust: Trust,
  actor: string,
) {
  if (lower(actor) !== lower(trust.host))
    throw new Error("Only the pinned host wallet can start this round");
  const session = await loadLobbySession(reader, trust);
  if (session.snapshot)
    throw new Error(
      "This lobby already has a round. Create a new lobby for a rematch.",
    );
  if (!session.roster.length)
    throw new Error(
      "At least one funded participant must register before starting",
    );
  const timing = await reader.getBlockTiming();
  return writer.createEntity(
    WorldSchema,
    manifestValues(
      session.lobby.worldId,
      session.lobby.roundId,
      session.lobby.map,
      session.roster.map((m) => m.key),
      timing.currentBlock + 12n,
      session.lobby.key,
    ),
    { expiration: ExpirationTime.fromDays(7), flags: { readonly: true } },
  );
}
