import { expect, it } from "vitest";
import {
  VENUE,
  PROTOCOL,
  digest,
  practiceSession,
  reconcileWorld,
  registrationValid,
  selectRoster,
  validateLobby,
  type Lobby,
} from "@riftrun/world-protocol";
function fixture() {
  const f = practiceSession();
  const lobby: Lobby = {
    ...f.manifest,
    key: f.manifest.lobbyKey,
    capacity: 16,
    protocol: PROTOCOL,
    map: VENUE,
    mapHash: digest(VENUE),
  };
  return { ...f, lobby };
}
it("validates the pinned host lobby and rejects copied schema records", () => {
  const f = fixture();
  expect(() => validateLobby(f.lobby, f.trust, 2n)).not.toThrow();
  expect(() =>
    validateLobby({ ...f.lobby, creator: f.members[0].player }, f.trust, 2n),
  ).toThrow("Untrusted lobby");
});
it("accepts self-owned registrations and rejects forged player claims and cross-lobby records", () => {
  const f = fixture();
  const member = f.members[0];
  expect(registrationValid(member, f.lobby, 2n)).toBe(true);
  expect(
    registrationValid({ ...member, player: f.members[1].player }, f.lobby, 2n),
  ).toBe(false);
  expect(
    registrationValid({ ...member, lobbyKey: f.manifest.key }, f.lobby, 2n),
  ).toBe(false);
});
it("selects one earliest registration per wallet and bounds roster capacity deterministically", () => {
  const f = fixture();
  f.lobby.capacity = 2;
  const later = {
    ...f.members[0],
    key: `0x${"f".repeat(64)}`,
    role: "BREAKER" as const,
    createdAt: 1n,
    updatedAt: 1n,
  };
  const records = [later, ...f.members];
  expect(selectRoster(f.lobby, records, 3n)).toEqual(
    selectRoster(f.lobby, [...records].reverse(), 3n),
  );
  const roster = selectRoster(f.lobby, records, 3n);
  expect(roster).toHaveLength(2);
  expect(roster[0].role).toBe("BUILDER");
});
it("excludes future and insufficiently-lived registrations", () => {
  const f = fixture();
  expect(
    registrationValid(
      { ...f.members[0], createdAt: 10n, updatedAt: 10n },
      f.lobby,
      2n,
    ),
  ).toBe(false);
  expect(
    registrationValid({ ...f.members[0], expiresAt: 20n }, f.lobby, 2n),
  ).toBe(false);
});
it("rejects contradictory copies of one registration key in either order", () => {
  const f = fixture();
  const bad = { ...f.members[0], role: "BREAKER" as const };
  expect(selectRoster(f.lobby, [f.members[0], bad], 2n)).toEqual([]);
  expect(selectRoster(f.lobby, [bad, f.members[0]], 2n)).toEqual([]);
});
it("keeps the pinned roster fixed when late wallets register, and rejects post-manifest substitutions", () => {
  const f = fixture();
  const late = {
    ...f.members[0],
    key: `0x${"e".repeat(64)}`,
    createdAt: 1n,
    updatedAt: 1n,
  };
  const before = reconcileWorld(f.manifest, f.members, [], 3n, f.trust);
  expect(
    reconcileWorld(f.manifest, [...f.members, late], [], 3n, f.trust),
  ).toEqual(before);
  f.manifest.memberKeys[0] = late.key;
  expect(() =>
    reconcileWorld(f.manifest, [late, ...f.members.slice(1)], [], 3n, f.trust),
  ).toThrow("Invalid pinned membership");
});
