export type Point = { x: number; y: number };
export type Kind = "BRIDGE" | "WALL";
export type Role = "BUILDER" | "BREAKER";
export type Zone = Point & {
  w: number;
  h: number;
  label: string;
  color: string;
  solid: boolean;
};
export type EditSite = Point & { id: string; label: string; kind: Kind };
export type Checkpoint = Point & {
  id: string;
  label: string;
  action: string;
  holdMs: number;
};
export type VenueMap = {
  version: string;
  width: number;
  height: number;
  spawn: Point;
  finish: Point;
  zones: Zone[];
  gaps: Point[];
  sites: EditSite[];
  checkpoints: Checkpoint[];
};

// Original code-drawn adaptation of the user-supplied Mumbai venue reference.
// Grid geometry is game-specific and is not an official venue navigation map.
export const VENUE: VenueMap = {
  version: "mumbai-venue-mission-v2",
  width: 42,
  height: 29,
  spawn: { x: 2, y: 26 },
  finish: { x: 37, y: 12 },
  zones: [
    {
      x: 1,
      y: 1,
      w: 10,
      h: 5,
      label: "MEAL\nCATERING",
      color: "#f48c23",
      solid: true,
    },
    {
      x: 12,
      y: 1,
      w: 3,
      h: 5,
      label: "BAG\nSTORAGE",
      color: "#23859b",
      solid: true,
    },
    {
      x: 16,
      y: 1,
      w: 3,
      h: 5,
      label: "QUIET\nSPACE",
      color: "#dd5093",
      solid: true,
    },
    {
      x: 20,
      y: 1,
      w: 3,
      h: 5,
      label: "WORKSHOP\n01",
      color: "#795291",
      solid: true,
    },
    {
      x: 24,
      y: 1,
      w: 3,
      h: 5,
      label: "WORKSHOP\n02",
      color: "#795291",
      solid: true,
    },
    {
      x: 28,
      y: 1,
      w: 13,
      h: 5,
      label: "HACKING SPACE\nNORTH",
      color: "#15b4d2",
      solid: true,
    },
    {
      x: 7,
      y: 8,
      w: 11,
      h: 6,
      label: "HACKING SPACE\nWEST",
      color: "#15b4d2",
      solid: true,
    },
    {
      x: 23,
      y: 8,
      w: 10,
      h: 11,
      label: "HACKING SPACE\nCENTRAL",
      color: "#15b4d2",
      solid: true,
    },
    {
      x: 36,
      y: 8,
      w: 5,
      h: 11,
      label: "MAIN\nSTAGE",
      color: "#c9e9fa",
      solid: false,
    },
    {
      x: 34,
      y: 9,
      w: 1,
      h: 9,
      label: "PARTNERS",
      color: "#78bd48",
      solid: true,
    },
    { x: 1, y: 12, w: 2, h: 7, label: "HACK", color: "#15b4d2", solid: true },
    {
      x: 11,
      y: 17,
      w: 8,
      h: 4,
      label: "HACKING\nSPACE SOUTH",
      color: "#15b4d2",
      solid: true,
    },
    {
      x: 7,
      y: 15,
      w: 3,
      h: 1,
      label: "ACTIVITIES",
      color: "#e6b92e",
      solid: true,
    },
    { x: 1, y: 21, w: 2, h: 3, label: "HELP", color: "#278b83", solid: true },
    { x: 4, y: 21, w: 2, h: 3, label: "REG", color: "#b4b74d", solid: true },
    { x: 8, y: 21, w: 2, h: 3, label: "VIP", color: "#78bd48", solid: true },
    {
      x: 13,
      y: 25,
      w: 9,
      h: 3,
      label: "RESTROOMS",
      color: "#355eaa",
      solid: true,
    },
    {
      x: 23,
      y: 22,
      w: 10,
      h: 1,
      label: "MENTORS + PARTNERS",
      color: "#78bd48",
      solid: true,
    },
    {
      x: 34,
      y: 22,
      w: 7,
      h: 3,
      label: "JUDGING ROOMS",
      color: "#e73747",
      solid: true,
    },
  ],
  gaps: [
    { x: 21, y: 7 },
    ...Array.from({ length: 19 }, (_, i) => ({ x: i + 4, y: 16 })),
    { x: 28, y: 21 },
  ],
  checkpoints: [
    {
      id: "check-in",
      x: 3,
      y: 24,
      label: "Check in",
      action: "Press E at the registration desk",
      holdMs: 0,
    },
    {
      id: "build",
      x: 18,
      y: 11,
      label: "Build the demo",
      action: "Hold E for 3 seconds at the hacking terminal",
      holdMs: 3000,
    },
    {
      id: "review",
      x: 22,
      y: 21,
      label: "Get the review",
      action: "Press E to deliver your demo to the mentor",
      holdMs: 0,
    },
  ],
  sites: [
    {
      id: "north-rift",
      x: 21,
      y: 7,
      label: "Workshop crossing",
      kind: "BRIDGE",
    },
    {
      id: "central-rift",
      x: 20,
      y: 16,
      label: "Central shortcut",
      kind: "BRIDGE",
    },
    {
      id: "south-rift",
      x: 28,
      y: 21,
      label: "Mentor crossing",
      kind: "BRIDGE",
    },
    { id: "west-wall", x: 5, y: 15, label: "West corridor", kind: "WALL" },
    { id: "center-wall", x: 20, y: 12, label: "Central aisle", kind: "WALL" },
    { id: "stage-wall", x: 35, y: 20, label: "Stage approach", kind: "WALL" },
  ],
};

export function cellKey(p: Point): string {
  return `${p.x},${p.y}`;
}
export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}
export function baseWalkable(map: VenueMap, p: Point): boolean {
  if (p.x < 1 || p.y < 1 || p.x >= map.width - 1 || p.y >= map.height - 1)
    return false;
  return (
    !map.zones.some(
      (z) =>
        z.solid &&
        p.x >= z.x &&
        p.x < z.x + z.w &&
        p.y >= z.y &&
        p.y < z.y + z.h,
    ) && !map.gaps.some((g) => samePoint(g, p))
  );
}

export function isWalkable(
  map: VenueMap,
  p: Point,
  cells: readonly (Point & { kind: Kind })[],
): boolean {
  const overlay = cells.find((c) => samePoint(c, p));
  return overlay ? overlay.kind === "BRIDGE" : baseWalkable(map, p);
}

export function hasSafeRoute(
  map: VenueMap,
  cells: readonly (Point & { kind: Kind })[],
): boolean {
  const seen = new Set<string>();
  const queue = [map.spawn];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    const key = cellKey(p);
    if (seen.has(key) || !isWalkable(map, p, cells)) continue;
    seen.add(key);
    queue.push(
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    );
  }
  return [map.finish, ...(map.checkpoints ?? [])].every((p) =>
    seen.has(cellKey(p)),
  );
}

export function validateMap(value: unknown): value is VenueMap {
  if (!value || typeof value !== "object") return false;
  const m = value as VenueMap;
  const point = (p: Point) =>
    p &&
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < m.width &&
    p.y < m.height;
  if (
    typeof m.version !== "string" ||
    !Number.isInteger(m.width) ||
    !Number.isInteger(m.height) ||
    m.width < 8 ||
    m.width > 64 ||
    m.height < 8 ||
    m.height > 64
  )
    return false;
  if (
    !point(m.spawn) ||
    !point(m.finish) ||
    !Array.isArray(m.zones) ||
    m.zones.length > 64 ||
    !Array.isArray(m.sites) ||
    m.sites.length > 32 ||
    !Array.isArray(m.gaps) ||
    m.gaps.length > 64 ||
    !Array.isArray(m.checkpoints) ||
    m.checkpoints.length !== 3
  )
    return false;
  if (
    !m.zones.every(
      (z) =>
        point(z) &&
        Number.isInteger(z.w) &&
        Number.isInteger(z.h) &&
        z.w > 0 &&
        z.h > 0 &&
        z.x + z.w <= m.width &&
        z.y + z.h <= m.height &&
        typeof z.label === "string" &&
        z.label.length <= 64 &&
        /^#[0-9a-f]{6}$/i.test(z.color) &&
        typeof z.solid === "boolean",
    )
  )
    return false;
  if (
    !m.gaps.every(point) ||
    !m.sites.every(
      (s) =>
        point(s) &&
        typeof s.id === "string" &&
        typeof s.label === "string" &&
        ["BRIDGE", "WALL"].includes(s.kind) &&
        !samePoint(s, m.spawn) &&
        !samePoint(s, m.finish),
    )
  )
    return false;
  if (
    !m.checkpoints.every(
      (c) =>
        point(c) &&
        typeof c.id === "string" &&
        typeof c.label === "string" &&
        typeof c.action === "string" &&
        Number.isInteger(c.holdMs) &&
        c.holdMs >= 0 &&
        c.holdMs <= 5000 &&
        !m.sites.some((s) => Math.abs(s.x - c.x) + Math.abs(s.y - c.y) <= 1),
    )
  )
    return false;
  if (new Set(m.checkpoints.map((c) => c.id)).size !== m.checkpoints.length)
    return false;
  if (new Set(m.sites.map(cellKey)).size !== m.sites.length) return false;
  return (
    hasSafeRoute(m, []) &&
    hasSafeRoute(
      m,
      m.sites.filter((s) => s.kind === "WALL"),
    )
  );
}
