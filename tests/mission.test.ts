import { expect, it } from "vitest";
import {
  VENUE,
  freshMission,
  stepMission,
  type Mission,
  type Point,
} from "@riftrun/world-protocol";
function step(
  state: Mission,
  at: Point,
  overrides: Partial<Parameters<typeof stepMission>[1]> = {},
) {
  return stepMission(
    state,
    {
      position: { x: at.x + 0.5, y: at.y + 0.5 },
      pressed: true,
      held: true,
      delta: 100,
      paused: false,
      timeRemaining: 100,
      ...overrides,
    },
    VENUE,
  );
}
it("requires ordered nearby interactions before Main Stage can finish", () => {
  let state = freshMission();
  expect(step(state, VENUE.finish).finished).toBe(false);
  expect(step(state, VENUE.checkpoints[2]).step).toBe(0);
  state = step(state, VENUE.checkpoints[0]);
  expect(state.step).toBe(1);
  for (let i = 0; i < 30; i++) state = step(state, VENUE.checkpoints[1]);
  expect(state.step).toBe(2);
  expect(step(state, VENUE.finish).finished).toBe(false);
  state = step(state, VENUE.checkpoints[2]);
  expect(state.step).toBe(3);
  expect(step(state, VENUE.finish).finished).toBe(true);
});
it("resets an unfinished build when leaving or releasing interaction", () => {
  let state = { step: 1, heldMs: 1400, finished: false };
  expect(step(state, VENUE.spawn).heldMs).toBe(0);
  expect(step(state, VENUE.checkpoints[1], { held: false }).heldMs).toBe(0);
});
it("cannot advance while paused, timed out, or by holding through a long suspended frame", () => {
  const state = freshMission();
  expect(step(state, VENUE.checkpoints[0], { paused: true })).toEqual(state);
  expect(step(state, VENUE.checkpoints[0], { timeRemaining: 0 })).toEqual(
    state,
  );
  expect(
    step({ step: 1, heldMs: 0, finished: false }, VENUE.checkpoints[1], {
      delta: 5000,
    }).heldMs,
  ).toBe(100);
});
it("requires a fresh interaction press for instant tasks", () => {
  expect(
    step(freshMission(), VENUE.checkpoints[0], { pressed: false }).step,
  ).toBe(0);
});
