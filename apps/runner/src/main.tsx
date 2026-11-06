import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import { VENUE } from "@riftrun/world-protocol";
import { VenueMap } from "../../shared/VenueMap";
import { Proof } from "../../shared/Proof";
import { crowdLink, useWorld } from "../../shared/session";
import { emptyVotes, type VoteState } from "../../shared/votes";
import { Game } from "./Game";
import "../../shared/styles.css";

function App() {
  const session = useWorld(); const { snapshot, config, stale, seconds } = session;
  const map = snapshot?.manifest.map ?? VENUE; const [started, setStarted] = useState(false); const [won, setWon] = useState(false); const [badges, setBadges] = useState(0); const [round, setRound] = useState(0);
  const movement = useRef({ x: 0, y: 0 }); const [votes, setVotes] = useState<VoteState>(emptyVotes(config.room)); const [guestsOnline, setGuestsOnline] = useState(false);
  const invite = crowdLink(session);
  useEffect(() => {
    const url = import.meta.env.VITE_GUEST_SOCKET_URL; if (!url) return;
    const socket = io(url, { reconnectionAttempts: 3 });
    socket.on("connect", () => { setGuestsOnline(true); socket.emit("spectate", { room: config.room }); });
    socket.on("disconnect", () => setGuestsOnline(false)); socket.on("state", (value: VoteState) => setVotes(value));
    return () => { socket.disconnect(); };
  }, [config.room]);
  const reset = () => { session.restart(); setWon(false); setBadges(0); setRound(r => r + 1); setStarted(true); };
  const status = config.live ? stale ? "STALE / UNVERIFIED" : "CONFIRMED ON ARKIV" : "SIMULATED PRACTICE";
  const timedOut = started && seconds <= 0;
  return <main className="runner-shell">
    <header className="masthead"><a className="wordmark" href="/">RIFT<span>↗</span>RUN</a><div className="event-lockup"><span>ETHGLOBAL</span><b>MUMBAI / 2026</b></div><div className={`status ${config.live && !stale ? "live" : ""}`}><i />{status}</div></header>
    <section className="runner-intro"><div><div className="eyebrow">ONE RUNNER. THE CROWD CONTROLS REALITY.</div><h1>The venue is<br/><em>your playground.</em></h1></div><div className="round-clock"><span>{config.live ? "ROUND · BLOCK ESTIMATE" : "PRACTICE ROUND"}</span><b>{Math.floor(seconds / 60).toString().padStart(2, "0")}<small>:</small>{(seconds % 60).toString().padStart(2, "0")}</b><p>3 badges. One Main Stage. Make it.</p></div></section>
    <div className="play-layout"><section className="play-area" aria-label="Venue game">
      <div className="map-topline"><span><i className="small-dot"/> MUMBAI VENUE RUN</span><span>BADGES <b>{badges}/3</b></span><span className="shift">NEXT SHIFT <b>{10 - (Math.floor(session.elapsed / 1000) % 10)}s</b></span></div>
      <div className={`map-stage ${stale ? "is-stale" : ""}`}><VenueMap map={map} cells={snapshot?.state.cells ?? []}/><Game map={map} cells={snapshot?.state.cells ?? []} paused={!started || stale || timedOut || won} round={round} onFinish={() => setWon(true)} onBadges={setBadges} movement={movement}/>
        {(!started || won || timedOut || (config.live && stale)) && <div className="game-overlay"><div className="overlay-card"><span className="eyebrow">{stale ? "ARKIV READ REQUIRED" : won ? "STAGE REACHED" : timedOut ? "ROUND COMPLETE" : "WELCOME TO THE RIFT"}</span><h2>{stale ? "World unverified." : won ? "You made it." : timedOut ? "Time for a rematch?" : "Ready to make a run?"}</h2><p>{stale ? "The game is paused until a fresh, consistent Arkiv read succeeds." : "Collect the three gold badges, then reach Main Stage. The crowd can change your route."}</p>{!stale && (!config.live || !timedOut) && <button className="button-primary" onClick={reset}>{won || timedOut ? "RUN IT BACK ↗" : "LET’S RUN ↗"}</button>}{config.live && timedOut && <p>The host must register a new live round.</p>}</div></div>}
      </div>
      <div className="map-bottomline"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys to move</span><span><i className="legend-bridge"/> Bridge <i className="legend-wall"/> Wall <i className="legend-badge"/> Badge</span></div>
      <div className="touch-controls" aria-label="Touch movement controls">{[{ text: "←", x: -1, y: 0 }, { text: "↑", x: 0, y: -1 }, { text: "↓", x: 0, y: 1 }, { text: "→", x: 1, y: 0 }].map(d => <button key={d.text} aria-label={`Move ${d.text}`} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); movement.current = { x: d.x, y: d.y }; }} onPointerUp={() => movement.current = { x: 0, y: 0 }} onPointerCancel={() => movement.current = { x: 0, y: 0 }}>{d.text}</button>)}</div>
    </section><aside className="crowd-panel"><span className="eyebrow">DON’T JUST WATCH.</span><h2>Change<br/>the route.</h2><p>Build a way through.<br/>Or get in the runner’s way.</p><a className="qr-card" href={invite} target="_blank" rel="noreferrer" aria-label="Open Crowd Editor"><QRCodeSVG value={invite} size={160} bgColor="#fff6e5" fgColor="#321321" level="M"/><span>SCAN. PICK A SIDE. PLAY. ↗</span></a><div className="audience-count"><b>{votes.audience.toString().padStart(2, "0")}</b><div>IN THE CROWD<span>{guestsOnline ? "Live guest connections" : "Guest channel offline"}</span></div></div><div className="team-counts"><span>BUILDERS <b>{votes.builders}</b></span><span>BREAKERS <b>{votes.breakers}</b></span></div><p className="fine-print">Guest votes are offchain. Authorized wallets commit world edits to Arkiv.</p></aside></div>
    <div className="under-map"><p>YOUR WORLD. THEIR NEXT MOVE.</p><span>{config.live ? "Wallet-owned edits · Public reads · Expiring structures" : "Practice is local and simulated. Live Arkiv proof is not configured."}</span></div>
    <Proof session={session}/><footer><span>RIFT RUN / BUILT AT ETHGLOBAL MUMBAI</span><span>Shared world state powered by Arkiv ↗</span></footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
