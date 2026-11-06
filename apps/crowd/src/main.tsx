import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io, type Socket } from "socket.io-client";
import { VENUE, type Role } from "@riftrun/world-protocol";
import { VenueMap } from "../../shared/VenueMap";
import { Proof } from "../../shared/Proof";
import { useWorld } from "../../shared/session";
import { emptyVotes, type VoteState } from "../../shared/votes";
import "../../shared/styles.css";

function App() {
  const session = useWorld(); const map = session.snapshot?.manifest.map ?? VENUE;
  const [team, setTeam] = useState<Role>("BUILDER"); const [selected, setSelected] = useState("north-rift");
  const [votes, setVotes] = useState<VoteState>(emptyVotes(session.config.room)); const [online, setOnline] = useState(false); const [voteMessage, setVoteMessage] = useState("");
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const endpoint = import.meta.env.VITE_GUEST_SOCKET_URL; if (!endpoint) return;
    const socket = io(endpoint, { reconnectionAttempts: 3 }); socketRef.current = socket;
    socket.on("connect", () => { setOnline(true); socket.emit("join", { room: session.config.room, team }); });
    socket.on("disconnect", () => setOnline(false)); socket.on("state", (value: VoteState) => setVotes(value)); socket.on("notice", (message: string) => setVoteMessage(message));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [session.config.room]);
  const chooseTeam = (value: Role) => { setTeam(value); setSelected(value === "BUILDER" ? "north-rift" : "center-wall"); setVoteMessage(""); socketRef.current?.emit("join", { room: session.config.room, team: value }); };
  const site = map.sites.find(s => s.id === selected) ?? map.sites[0];
  const walletMember = session.snapshot?.members.find(m => m.player.toLowerCase() === session.account?.toLowerCase());
  const vote = () => { if (!online) { setVoteMessage("Guest channel offline. Votes cannot be submitted right now."); return; } socketRef.current?.emit("vote", { siteId: site.id }, (reply: { ok: boolean; message: string }) => setVoteMessage(reply.message)); };
  const totalVotes = Object.values(votes.votes).reduce((a, b) => a + b, 0);
  return <main className="crowd-shell">
    <header className="masthead"><a className="wordmark" href="/">RIFT<span>↗</span>RUN</a><span className="event-lockup"><b>CROWD CONTROL</b><span>MUMBAI / 2026</span></span></header>
    <div className="crowd-heading"><div className="eyebrow">THE NEXT MOVE IS YOURS.</div><h1>Help them.<br/><em>Or make it harder.</em></h1><p>One runner is crossing the venue. Pick a side and change what happens next.</p></div>
    <div className="team-switch" aria-label="Choose your team"><button className={team === "BUILDER" ? "active builder" : ""} aria-pressed={team === "BUILDER"} onClick={() => chooseTeam("BUILDER")}><span>＋</span><b>BUILDERS</b><small>Give them a way through</small></button><button className={team === "BREAKER" ? "active breaker" : ""} aria-pressed={team === "BREAKER"} onClick={() => chooseTeam("BREAKER")}><span>×</span><b>BREAKERS</b><small>Put something in their way</small></button></div>
    <section className="crowd-map-panel"><div className="map-topline"><span>PICK A CORRIDOR</span><span className="status-inline">{session.config.live ? session.stale ? "STALE / UNVERIFIED" : "ARKIV READ CONFIRMED" : "SIMULATED MAP"}</span></div><VenueMap map={map} cells={session.snapshot?.state.cells ?? []} selected={selected} compact onSelect={id => { const target = map.sites.find(s => s.id === id); if (target?.kind === (team === "BUILDER" ? "BRIDGE" : "WALL")) setSelected(id); }}/></section>
    <section className="action-panel"><div className="eyebrow">{team === "BUILDER" ? "＋ BUILD A BRIDGE" : "× DROP A WALL"}</div><div className="site-choices">{map.sites.filter(s => s.kind === (team === "BUILDER" ? "BRIDGE" : "WALL")).map(s => <button key={s.id} className={s.id === selected ? "selected" : ""} aria-pressed={s.id === selected} onClick={() => setSelected(s.id)}>{s.label}<span>{votes.votes[s.id] ?? 0}</span></button>)}</div><button className={`vote-button ${team === "BREAKER" ? "breaker" : ""}`} onClick={vote} disabled={!online}>VOTE FOR {site?.label.toUpperCase()} ↗</button><div className="vote-meta"><span><i className={`connection-dot ${online ? "online" : ""}`}/>{online ? `${votes.audience} connected guests` : "Guest channel offline"}</span><span>{totalVotes} votes this window</span></div>{voteMessage && <p className="notice" role="status">{voteMessage}</p>}<p className="fine-print">Guest voting is offchain. An authorized wallet holder must commit the edit before it can affect the live game.</p></section>
    <section className="wallet-panel"><div><span className="eyebrow">WORLD EDITORS</span><h2>Make it real.</h2><p>{session.config.live ? "Publish a temporary, wallet-owned edit to Arkiv Rabdi." : "Try a local edit. Practice records are simulated and stay in this browser."}</p></div>{session.config.live && <button className="button-secondary" onClick={session.connect}>{session.account ? `${session.account.slice(0, 6)}…${session.account.slice(-4)}` : "CONNECT WALLET ↗"}</button>}{walletMember && <p className="member-role">Registered role: {walletMember.role} · max {walletMember.maxActive} active edits</p>}<button className="button-primary" disabled={session.busy || (session.config.live && (!session.account || session.stale || !session.roundOpen))} onClick={() => session.publish(site.id)}>{session.busy ? "WAITING FOR WALLET…" : session.config.live ? "COMMIT TO ARKIV ↗" : "TRY SIMULATED EDIT ↗"}</button>{session.transaction.status && <p role="status" className="notice">{session.transaction.status}</p>}{session.error && <p className="error" role="alert">{session.error}</p>}{!session.config.live && session.seconds === 0 && <button className="button-secondary" onClick={session.restart}>RESTART PRACTICE</button>}</section>
    <Proof session={session}/><footer><span>RIFT RUN / ETHGLOBAL MUMBAI</span><span>Powered by Arkiv ↗</span></footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
