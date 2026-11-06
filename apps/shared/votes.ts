export type VoteState = { room: string; phase: number; audience: number; builders: number; breakers: number; votes: Record<string, number>; winner: string | null };
export const emptyVotes = (room: string): VoteState => ({ room, phase: 0, audience: 0, builders: 0, breakers: 0, votes: {}, winner: null });
