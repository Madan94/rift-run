import type { Point, VenueMap } from "./venue";
export type Mission = { step: number; heldMs: number; finished: boolean };
export const freshMission = (): Mission => ({
  step: 0,
  heldMs: 0,
  finished: false,
});
export function nearPoint(position: Point, target: Point): boolean {
  return (
    Math.hypot(position.x - (target.x + 0.5), position.y - (target.y + 0.5)) <
    0.95
  );
}
export function stepMission(
  state: Mission,
  input: {
    position: Point;
    pressed: boolean;
    held: boolean;
    delta: number;
    paused: boolean;
    timeRemaining: number;
  },
  map: VenueMap,
): Mission {
  if (state.finished || input.paused || input.timeRemaining <= 0) return state;
  const task = map.checkpoints[state.step];
  if (!task)
    return nearPoint(input.position, map.finish)
      ? { ...state, finished: true }
      : state;
  if (!nearPoint(input.position, task))
    return state.heldMs ? { ...state, heldMs: 0 } : state;
  if (!task.holdMs)
    return input.pressed
      ? { step: state.step + 1, heldMs: 0, finished: false }
      : state;
  const heldMs = input.held
    ? Math.min(
        task.holdMs,
        state.heldMs + Math.max(0, Math.min(100, input.delta)),
      )
    : 0;
  return heldMs >= task.holdMs
    ? { step: state.step + 1, heldMs: 0, finished: false }
    : { ...state, heldMs };
}
