import { describe, expect, it } from "vitest";
import { VENUE, digest, hasSafeRoute, mergeOperationSets, practiceSession, reconcileWorld, validateMap, type WorldOp } from "@riftrun/world-protocol";
const key = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
function fixture() {
  const session = practiceSession();
  const op = (n: number, writer = 0, overrides: Partial<WorldOp> = {}): WorldOp => ({
    key: key(n), creator: session.members[writer].player, owner: session.members[writer].player,
    readonly: true, permissionlessExtension: false, createdAt: 1n, updatedAt: 1n, expiresAt: 16n,
    worldId: "practice", roundId: "practice-round", phase: 0, x: 21, y: 7, kind: "BRIDGE", ...overrides,
  });
  const run = (ops: WorldOp[], block = 3n) => reconcileWorld(session.manifest, session.members, ops, block, session.trust);
  return { ...session, op, run };
}
describe("venue and deterministic protocol", () => {
  it("has a safe venue route even with every allowed wall active", () => {
    expect(validateMap(VENUE)).toBe(true);
    expect(hasSafeRoute(VENUE, VENUE.sites.filter(s => s.kind === "WALL"))).toBe(true);
  });
  it("converges under 100 deterministic permutations of concurrent records", () => {
    const f = fixture(); const ops = [f.op(10), f.op(11, 1), f.op(12, 2, { kind: "WALL", x: 20, y: 12 }), f.op(13, 0, { x: 20, y: 16 })];
    const expected = f.run(ops);
    for (let i = 0; i < 100; i++) {
      const shuffled = [...ops];
      for (let j = shuffled.length - 1; j > 0; j--) { const at = (i * 17 + j * 3) % (j + 1); [shuffled[j], shuffled[at]] = [shuffled[at], shuffled[j]]; }
      expect(f.run(shuffled)).toEqual(expected);
    }
    expect(expected.cells).toHaveLength(3);
    expect(expected.rejected.some(r => r.reason === "conflict lost")).toBe(true);
  });
  it("deduplicates delivery without changing either digest", () => { const f = fixture(); expect(f.run([f.op(10), f.op(10)])).toEqual(f.run([f.op(10)])); });
  it("operation-set union is commutative, associative and idempotent without discarding losers", () => {
    const f = fixture(); const a = [f.op(10)]; const b = [f.op(11, 1)]; const c = [f.op(12)];
    expect(mergeOperationSets(a, b)).toEqual(mergeOperationSets(b, a));
    expect(mergeOperationSets(mergeOperationSets(a, b), c)).toEqual(mergeOperationSets(a, mergeOperationSets(b, c)));
    expect(mergeOperationSets(a, a)).toEqual(a);
    expect(mergeOperationSets(a, b, c)).toHaveLength(3);
  });
  it("rejects unauthorized creators, owner transfers and mutable entities", () => {
    const f = fixture(); const unauthorized = `0x${"f".repeat(40)}`;
    const state = f.run([f.op(10, 0, { creator: unauthorized, owner: unauthorized }), f.op(11, 0, { owner: unauthorized }), f.op(12, 0, { readonly: false })]);
    expect(state.cells).toEqual([]); expect(state.rejected).toHaveLength(3);
  });
  it("rejects copied host membership even when current owner is the host", () => {
    const f = fixture(); f.members[0].creator = f.members[0].player;
    expect(() => f.run([f.op(10)])).toThrow("Invalid pinned membership");
  });
  it("fails closed if a pinned membership is missing or duplicated inconsistently", () => {
    const f = fixture(); f.members.pop(); expect(() => f.run([])).toThrow("Pinned membership missing");
  });
  it("rejects the wrong role and non-editable coordinates", () => {
    const f = fixture(); const state = f.run([f.op(10, 0, { kind: "WALL", x: 20, y: 12 }), f.op(11, 0, { x: VENUE.spawn.x, y: VENUE.spawn.y }), f.op(12, 0, { x: -1 })]);
    expect(state.cells).toEqual([]); expect(state.rejected.map(r => r.reason)).toEqual(["role mismatch", "illegal edit site", "illegal edit site"]);
  });
  it("verifies phase against entity creation block and rejects future/late writes", () => {
    const f = fixture(); expect(f.run([f.op(10, 0, { phase: 1 }), f.op(11, 0, { createdAt: 5n, updatedAt: 5n, phase: 1 }), f.op(12, 0, { createdAt: 61n, updatedAt: 61n, phase: 12, expiresAt: 76n })]).cells).toEqual([]);
  });
  it("lets a newer phase supersede an earlier unexpired edit", () => {
    const f = fixture(); const state = f.run([f.op(10), f.op(11, 1, { createdAt: 6n, updatedAt: 6n, phase: 1, expiresAt: 21n })], 7n);
    expect(state.cells[0].entityKey).toBe(key(11));
  });
  it("expires exactly at the native cutoff and caps owner extensions", () => {
    const f = fixture(); expect(f.run([f.op(10)], 15n).cells).toHaveLength(1); expect(f.run([f.op(10)], 16n).cells).toEqual([]);
    expect(f.run([f.op(10, 0, { expiresAt: 9000n })], 16n).cells).toEqual([]);
  });
  it("documents active-cap backfill after expiry, including fresh reconstruction", () => {
    const f = fixture(); f.members[0].maxActive = 1;
    const a = f.op(10, 0, { expiresAt: 4n }); const b = f.op(11, 0, { x: 20, y: 16 });
    expect(f.run([a, b], 3n).accepted).toEqual([a.key]);
    expect(f.run([a, b], 4n).cells).toEqual(f.run([b], 4n).cells);
    expect(f.run([b], 4n).accepted).toEqual([b.key]);
  });
  it("rejects inconsistent content with a repeated entity key regardless of order", () => {
    const f = fixture(); const a = f.op(10); const b = f.op(10, 0, { x: 20, y: 16 });
    expect(f.run([a, b])).toEqual(f.run([b, a])); expect(f.run([a, b]).cells).toEqual([]);
  });
  it("verifies map digest, pinned host/key and bounded configuration", () => {
    const f = fixture(); f.manifest.mapHash = digest({ fake: true }); expect(() => f.run([])).toThrow("Invalid manifest");
    const other = fixture(); other.trust.host = other.members[0].player; expect(() => other.run([])).toThrow("Untrusted manifest");
    const bad = fixture(); bad.manifest.config.phaseBlocks = 0n; expect(() => bad.run([])).toThrow("Invalid or expired");
  });
  it("removes all effects at round end", () => {
    const f = fixture(); expect(f.run([f.op(10, 0, { createdAt: 59n, updatedAt: 59n, phase: 11, expiresAt: 74n })], 60n).cells).toEqual([]);
  });
});
