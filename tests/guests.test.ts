import { expect, it } from "vitest";
import { GuestRoom } from "../server/guest-channel/src/rooms";
it("counts actual guests, replaces votes, enforces teams and cleans up disconnects", () => {
  const room = new GuestRoom("test", 0);
  room.join("a", "BUILDER");
  room.join("b", "BREAKER");
  expect(room.vote("a", "north-rift")).toBe(true);
  room.vote("a", "central-rift");
  expect(room.vote("a", "center-wall")).toBe(false);
  expect(room.vote("missing", "north-rift")).toBe(false);
  expect(room.state().votes).toEqual({ "central-rift": 1 });
  expect(room.state().audience).toBe(2);
  room.leave("a");
  expect(room.state().votes).toEqual({});
  expect(room.state().builders).toBe(0);
});
it("resets votes at each window and resolves tied suggestions consistently", () => {
  const room = new GuestRoom("test", 0);
  room.join("a", "BUILDER");
  room.join("b", "BUILDER");
  room.vote("a", "north-rift");
  room.vote("b", "central-rift");
  expect(room.state().winner).toBe("central-rift");
  room.advance(10000);
  expect(room.state().phase).toBe(1);
  expect(room.state().votes).toEqual({});
});
