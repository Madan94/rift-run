import { expect, it } from "vitest";
import { collectPages, runnableQuery, safeError } from "@riftrun/arkiv-adapter";
const key = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
it("collects more than 100 rows using strictly ordered key cursors", async () => {
  const data = Array.from({ length: 205 }, (_, i) => ({ key: key(i + 1) })); const cursors: (string | undefined)[] = [];
  const result = await collectPages(async cursor => { cursors.push(cursor); return { rows: data.filter(r => !cursor || r.key > cursor).slice(0, 100), blockNumber: 42n, skipped: 0 }; });
  expect(result.rows).toEqual(data); expect(cursors).toEqual([undefined, key(100), key(200)]);
});
it("rejects cross-block pagination and unordered duplicate pages", async () => {
  let count = 0;
  await expect(collectPages(async () => ({ rows: [{ key: key(++count) }], blockNumber: BigInt(count), skipped: 0 }), 1)).rejects.toThrow("Chain advanced");
  await expect(collectPages(async () => ({ rows: [{ key: key(1) }, { key: key(1) }], blockNumber: 1n, skipped: 0 }))).rejects.toThrow("strictly ordered");
});
it("does not silently accept mismatched query rows", async () => {
  await expect(collectPages(async () => ({ rows: [], blockNumber: 1n, skipped: 1 }))).rejects.toThrow("schema mismatch");
});
it("escapes query literals and redacts credential-bearing URLs from user errors", () => {
  expect(runnableQuery("a'b", "r")).toContain("str('a''b')");
  expect(safeError(new Error("Failed https://example.test/?key=secret"))).not.toContain("secret");
});
