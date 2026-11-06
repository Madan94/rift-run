import { expect, it, vi, afterEach } from "vitest";
import { sessionConfig, sessionLink } from "../apps/shared/world-session";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("preserves pinned session identifiers while keeping play/crowd links on one origin", () => {
  vi.stubGlobal("location", new URL("https://riftrun.example/play"));
  const trust = { worldId: "w", lobbyKey: "l", host: "h", manifestKey: "m" };
  const url = new URL(sessionLink("/crowd", trust));
  expect(url.origin).toBe("https://riftrun.example");
  expect(url.pathname).toBe("/crowd");
  expect(url.searchParams.get("lobby")).toBe("l");
  expect(url.searchParams.get("manifest")).toBe("m");
});
it("marks incomplete live invites as live rather than silently switching to fixtures", () => {
  vi.stubGlobal(
    "location",
    new URL("https://riftrun.example/play?world=broken"),
  );
  expect(sessionConfig().live).toBe(true);
  vi.stubGlobal(
    "location",
    new URL("https://riftrun.example/play?world=broken&mode=practice"),
  );
  expect(sessionConfig().live).toBe(false);
});
it("does not mix a fresh lobby invite with an old environment-pinned manifest", () => {
  vi.stubEnv("VITE_RIFTRUN_MANIFEST_ENTITY_KEY", "old-manifest");
  vi.stubGlobal(
    "location",
    new URL("https://riftrun.example/play?world=new&lobby=new-lobby&host=host"),
  );
  const config = sessionConfig();
  expect(config.trust.manifestKey).toBe("");
  expect(config.trust.lobbyKey).toBe("new-lobby");
});
