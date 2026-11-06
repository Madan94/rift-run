import { VENUE, type Role } from "@riftrun/world-protocol";
import type { VoteState } from "../../../apps/shared/votes";
type Guest = { team: Role; siteId?: string };
export class GuestRoom {
  guests = new Map<string, Guest>(); phase = 0; started: number;
  constructor(public id: string, now = Date.now()) { this.started = now; }
  advance(now = Date.now()) { const phase = Math.floor((now - this.started) / 10000); if (phase !== this.phase) { this.phase = phase; for (const guest of this.guests.values()) delete guest.siteId; } }
  join(id: string, team: Role) { this.guests.set(id, { team }); }
  leave(id: string) { this.guests.delete(id); }
  vote(id: string, siteId: string): boolean {
    const guest = this.guests.get(id); const site = VENUE.sites.find(s => s.id === siteId);
    if (!guest || !site || site.kind !== (guest.team === "BUILDER" ? "BRIDGE" : "WALL")) return false;
    guest.siteId = siteId; return true;
  }
  state(): VoteState {
    const votes: Record<string, number> = {}; let builders = 0;
    for (const guest of this.guests.values()) { if (guest.team === "BUILDER") builders++; if (guest.siteId) votes[guest.siteId] = (votes[guest.siteId] ?? 0) + 1; }
    const ranked = Object.entries(votes).sort(([a, ac], [b, bc]) => bc - ac || (a < b ? -1 : 1));
    return { room: this.id, phase: this.phase, audience: this.guests.size, builders, breakers: this.guests.size - builders, votes, winner: ranked[0]?.[0] ?? null };
  }
}
