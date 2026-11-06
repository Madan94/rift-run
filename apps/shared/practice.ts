import {
  canonical,
  digest,
  practiceSession,
  type WorldOp,
} from "@riftrun/world-protocol";
type Practice = { id: string; startedAt: number | null; operations: WorldOp[] };
const storageKey = "riftrun.practice.v2";
export function readPractice(): Practice {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const value = JSON.parse(stored) as {
        id: string;
        startedAt: number | null;
        operations: Array<Record<string, unknown>>;
      };
      if (
        typeof value.id === "string" &&
        (value.startedAt === null || Number.isFinite(value.startedAt)) &&
        Array.isArray(value.operations) &&
        value.operations.length <= 100
      ) {
        const operations = value.operations
          .filter(
            (op) =>
              [op.key, op.creator, op.owner, op.worldId, op.roundId].every(
                (field) => typeof field === "string",
              ) &&
              Number.isInteger(op.phase) &&
              Number.isInteger(op.x) &&
              Number.isInteger(op.y) &&
              ["BRIDGE", "WALL"].includes(op.kind as string),
          )
          .map((op) => ({
            ...op,
            createdAt: BigInt(op.createdAt as string),
            updatedAt: BigInt(op.updatedAt as string),
            expiresAt: BigInt(op.expiresAt as string),
          })) as WorldOp[];
        return { id: value.id, startedAt: value.startedAt, operations };
      }
    }
  } catch {
    /* Corrupt local simulation data never falls back into live mode. */
  }
  return { id: "idle", startedAt: null, operations: [] };
}
export function startPractice() {
  const state: Practice = {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    operations: [],
  };
  localStorage.setItem(storageKey, canonical(state));
  return state;
}
export function addPracticeEdit(siteId: string) {
  const state = readPractice();
  const session = practiceSession();
  if (!state.startedAt || Date.now() - state.startedAt >= 120000)
    throw new Error("Start a practice round in /play first.");
  const site = session.manifest.map.sites.find((s) => s.id === siteId);
  if (!site) throw new Error("Unknown edit site");
  const block = BigInt(Math.floor((Date.now() - state.startedAt) / 2000));
  const actor = session.members[site.kind === "BRIDGE" ? 0 : 2].player;
  const op: WorldOp = {
    key: digest([state.id, crypto.randomUUID()]),
    creator: actor,
    owner: actor,
    readonly: true,
    permissionlessExtension: false,
    worldId: "practice",
    roundId: "practice-round",
    createdAt: block,
    updatedAt: block,
    expiresAt: block + 15n,
    phase: Number(block / 5n),
    x: site.x,
    y: site.y,
    kind: site.kind,
  };
  localStorage.setItem(
    storageKey,
    canonical({ ...state, operations: [...state.operations, op].slice(-100) }),
  );
  return op;
}
