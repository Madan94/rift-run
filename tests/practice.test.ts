import { expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  addPracticeEdit,
  readPractice,
  startPractice,
} from "../apps/shared/practice";
import { practiceSession, reconcileWorld } from "@riftrun/world-protocol";
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.useFakeTimers();
  vi.setSystemTime(1000000);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("stays idle until explicitly started and shares a reconstructable edit set between readers", () => {
  expect(readPractice().startedAt).toBeNull();
  expect(() => addPracticeEdit("central-rift")).toThrow(
    "Start a practice round",
  );
  startPractice();
  addPracticeEdit("central-rift");
  const left = readPractice();
  const right = readPractice();
  const session = practiceSession();
  expect(
    reconcileWorld(
      session.manifest,
      session.members,
      left.operations,
      0n,
      session.trust,
    ),
  ).toEqual(
    reconcileWorld(
      session.manifest,
      session.members,
      right.operations,
      0n,
      session.trust,
    ),
  );
  expect(left.operations).toHaveLength(1);
});
it("restarts with no prior edits and refuses new edits after the round", () => {
  const original = startPractice();
  addPracticeEdit("central-rift");
  vi.advanceTimersByTime(120000);
  expect(() => addPracticeEdit("central-rift")).toThrow(
    "Start a practice round",
  );
  expect(startPractice().id).not.toBe(original.id);
  expect(readPractice().operations).toEqual([]);
});
it("recovers from corrupt local simulation storage", () => {
  localStorage.setItem("riftrun.practice.v2", "{bad json");
  expect(readPractice().startedAt).toBeNull();
});
