import { expect, it } from "vitest";
import {
  VENUE,
  isWalkable,
  type Kind,
  type Point,
} from "@riftrun/world-protocol";
function distance(
  start: Point,
  goal: Point,
  cells: (Point & { kind: Kind })[],
) {
  const queue = [{ ...start, distance: 0 }];
  const seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    const key = p.x + "," + p.y;
    if (seen.has(key) || !isWalkable(VENUE, p, cells)) continue;
    if (p.x === goal.x && p.y === goal.y) return p.distance;
    seen.add(key);
    for (const [x, y] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      queue.push({ x: p.x + x, y: p.y + y, distance: p.distance + 1 });
  }
  return Infinity;
}
it("a central bridge materially shortens the build-to-review route and expiry restores the detour", () => {
  const start = VENUE.checkpoints[1];
  const finish = VENUE.checkpoints[2];
  const detour = distance(start, finish, []);
  const bridge = VENUE.sites.find((site) => site.id === "central-rift")!;
  const shortcut = distance(start, finish, [bridge]);
  expect(detour).toBeLessThan(Infinity);
  expect(shortcut).toBeLessThan(detour - 10);
  expect(distance(start, finish, [])).toBe(detour);
});
