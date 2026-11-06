import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { VENUE, freshMission } from "@riftrun/world-protocol";
import { VenueMap } from "../../shared/VenueMap";
import { Proof } from "../../shared/Proof";
import { crowdLink, sessionLink, useWorld } from "../../shared/world-session";
import MissionGame, { type PlayerStatus } from "./MissionGame";

export default function Runner() {
  const session = useWorld();
  const { snapshot, config, stale, seconds, startsIn } = session;
  const map =
    snapshot?.manifest.map ?? session.lobbySession?.lobby.map ?? VENUE;
  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [player, setPlayer] = useState<PlayerStatus>({
    mission: freshMission(),
    nearby: false,
  });
  const movement = useRef({ x: 0, y: 0 });
  const interaction = useRef({ held: false, pressed: false });
  const invite = crowdLink(session);
  const mission = player.mission;
  const timedOut = started && seconds <= 0;
  const waiting = config.live && !snapshot;
  const won = mission.finished;
  const task = map.checkpoints[mission.step];
  const reset = () => {
    if (!config.live) session.restart();
    setPlayer({ mission: freshMission(), nearby: false });
    setAttempt((value) => value + 1);
    setStarted(true);
  };
  useEffect(() => {
    const clear = () => {
      movement.current = { x: 0, y: 0 };
      interaction.current = { held: false, pressed: false };
    };
    window.addEventListener("blur", clear);
    return () => window.removeEventListener("blur", clear);
  }, []);
  const epoch =
    (config.live ? (snapshot?.manifest.key ?? "lobby") : session.practiceId) +
    ":" +
    attempt;
  const status = config.live
    ? stale
      ? "STALE / UNVERIFIED"
      : waiting
        ? "ARKIV LOBBY CONFIRMED"
        : "ARKIV READ CONFIRMED"
    : "SIMULATED PRACTICE";
  const phase = snapshot ? Math.max(0, snapshot.state.phase) : 0;
  const overlay =
    !started || won || timedOut || stale || waiting || startsIn > 0;
  const title = stale
    ? "World unverified."
    : waiting
      ? "The lobby is open."
      : startsIn > 0
        ? "Starting in ~" + startsIn + "s."
        : won
          ? "Your demo made it."
          : timedOut
            ? "Time for a rematch?"
            : "A mission across Mumbai.";
  const overlayText = stale
    ? "Paused until fresh Arkiv reads succeed. Confirmed changes never come from local fixtures."
    : waiting
      ? "Participants connect and register in Crowd. The host locks the roster and starts the round below."
      : startsIn > 0
        ? "The roster is locked. This countdown estimates the future start block."
        : "Check in, build your demo, get a mentor review, then make it to Main Stage. E to interact.";
  const canStart =
    !stale && !waiting && startsIn === 0 && (!config.live || seconds > 0);
  return (
    <main className="runner-shell">
      <header className="masthead">
        <a className="wordmark" href="/">
          RIFT<span>↗</span>RUN
        </a>
        <div className="event-lockup">
          <span>ETHGLOBAL</span>
          <b>MUMBAI / 2026</b>
        </div>
        <div className={"status " + (config.live && !stale ? "live" : "")}>
          <i />
          {status}
        </div>
      </header>
      <section className="runner-intro">
        <div>
          <div className="eyebrow">
            ONE RUNNER. EVERY WALLET CAN CHANGE THE ROUTE.
          </div>
          <h1>
            Build a demo.
            <br />
            <em>Make the stage.</em>
          </h1>
        </div>
        <div className="round-clock">
          <span>
            {config.live ? "ROUND · BLOCK ESTIMATE" : "PRACTICE ROUND"}
          </span>
          <b>
            {Math.floor(seconds / 60)
              .toString()
              .padStart(2, "0")}
            <small>:</small>
            {(seconds % 60).toString().padStart(2, "0")}
          </b>
          <p>Three checkpoints. One Main Stage.</p>
        </div>
      </section>
      <div className="mission-hud" aria-label="Checkpoint progress">
        {map.checkpoints.map((checkpoint, index) => (
          <div
            key={checkpoint.id}
            className={
              index < mission.step
                ? "done"
                : index === mission.step
                  ? "current"
                  : ""
            }
          >
            <span>{index < mission.step ? "✓" : "0" + (index + 1)}</span>
            <div>
              <b>{checkpoint.label}</b>
              <small>
                {index < mission.step
                  ? "Complete"
                  : index === mission.step
                    ? "Current objective"
                    : "Next up"}
              </small>
            </div>
          </div>
        ))}
        <div className={mission.step === 3 ? "current" : ""}>
          <span>↗</span>
          <div>
            <b>Main Stage</b>
            <small>{won ? "Mission complete" : "Deliver your demo"}</small>
          </div>
        </div>
      </div>
      <div className="play-layout">
        <section className="play-area" aria-label="Venue game">
          <div className="map-topline">
            <span>
              <i className="small-dot" /> MUMBAI VENUE MISSION
            </span>
            <span>
              TASKS <b>{mission.step}/3</b>
            </span>
            <span>
              EDIT PHASE <b>{phase}</b>
            </span>
          </div>
          <div className={"map-stage " + (stale ? "is-stale" : "")}>
            <VenueMap
              map={map}
              cells={snapshot?.state.cells ?? []}
              missionStep={mission.step}
            />
            <MissionGame
              map={map}
              cells={snapshot?.state.cells ?? []}
              paused={!started || stale || !session.roundOpen || won}
              seconds={seconds}
              epoch={epoch}
              onStatus={setPlayer}
              movement={movement}
              interaction={interaction}
            />
            {overlay && (
              <div className="game-overlay">
                <div className="overlay-card">
                  <span className="eyebrow">
                    {won
                      ? "MISSION COMPLETE"
                      : config.live
                        ? "WALLET-OWNED WORLD"
                        : "LOCAL SIMULATION"}
                  </span>
                  <h2>{title}</h2>
                  <p>{overlayText}</p>
                  {canStart && (
                    <button className="button-primary" onClick={reset}>
                      {won || timedOut ? "TRY AGAIN ↗" : "LET’S RUN ↗"}
                    </button>
                  )}
                  {config.live && timedOut && (
                    <a href="/#host">Host: create a new lobby ↗</a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="objective-line" role="status">
            <b>
              {won
                ? "DEMO DELIVERED"
                : mission.step === 3
                  ? "FINAL OBJECTIVE"
                  : "OBJECTIVE " + (mission.step + 1)}
            </b>
            <span>
              {task ? task.action : "Reach the finish marker inside Main Stage"}
            </span>
            {task?.holdMs ? (
              <progress
                aria-label="Demo build progress"
                value={mission.heldMs}
                max={task.holdMs}
              />
            ) : null}
            {player.nearby && !won && (
              <kbd>{task?.holdMs ? "HOLD E" : "E"}</kbd>
            )}
          </div>
          <div className="map-bottomline">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> move · <kbd>E</kbd> interact
            </span>
            <span>
              <i className="legend-bridge" /> Bridge{" "}
              <i className="legend-wall" /> Wall · ① checkpoint
            </span>
          </div>
          <div className="touch-controls" aria-label="Touch game controls">
            {[
              { label: "left", text: "←", x: -1, y: 0 },
              { label: "up", text: "↑", x: 0, y: -1 },
              { label: "down", text: "↓", x: 0, y: 1 },
              { label: "right", text: "→", x: 1, y: 0 },
            ].map((direction) => (
              <button
                key={direction.label}
                aria-label={"Move " + direction.label}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  movement.current = { x: direction.x, y: direction.y };
                }}
                onPointerUp={() => (movement.current = { x: 0, y: 0 })}
                onPointerCancel={() => (movement.current = { x: 0, y: 0 })}
              >
                {direction.text}
              </button>
            ))}
            <button
              className="interact-button"
              aria-label="Interact at checkpoint"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                interaction.current = { held: true, pressed: true };
              }}
              onPointerUp={() => (interaction.current.held = false)}
              onPointerCancel={() => (interaction.current.held = false)}
            >
              E
            </button>
          </div>
        </section>
        <aside className="crowd-panel">
          <span className="eyebrow">EVERY EDIT HAS AN OWNER.</span>
          <h2>
            Change
            <br />
            the route.
          </h2>
          <p>
            Choose a side. Connect a wallet.
            <br />
            Publish your own intervention.
          </p>
          <a className="qr-card" href={invite} aria-label="Open Crowd Editor">
            <QRCodeSVG
              value={invite}
              size={160}
              bgColor="#fff6e5"
              fgColor="#321321"
              level="M"
            />
            <span>OPEN CROWD CONTROL ↗</span>
          </a>
          <div className="audience-count">
            <b>
              {config.live ? (session.lobbySession?.roster.length ?? 0) : "—"}
            </b>
            <div>
              {config.live ? "REGISTERED WALLETS" : "PRACTICE MODE"}
              <span>
                {config.live
                  ? "Roster, not online attendance"
                  : "Shared between this browser’s tabs"}
              </span>
            </div>
          </div>
          {config.live ? (
            <>
              <button className="button-secondary" onClick={session.connect}>
                {session.account
                  ? session.account.slice(0, 6) +
                    "…" +
                    session.account.slice(-4)
                  : "CONNECT HOST WALLET"}
              </button>
              {session.isHost && !snapshot && (
                <button
                  className="button-primary"
                  disabled={
                    session.busy ||
                    stale ||
                    !session.lobbySession?.roster.length
                  }
                  onClick={session.lockRound}
                >
                  {session.busy
                    ? "WAITING FOR WALLET…"
                    : "LOCK ROSTER & START ↗"}
                </button>
              )}
              {session.isHost && snapshot && (
                <a className="new-round-link" href="/#host">
                  Create a new round ↗
                </a>
              )}
            </>
          ) : (
            <a className="new-round-link" href="/#host">
              Set up a live Arkiv lobby ↗
            </a>
          )}
          <p className="fine-print">
            {config.live
              ? "Participants sign their own edits. The game applies actual Arkiv reads and removes expired structures."
              : "No blockchain transactions in practice. Phone browsers have separate local practice state; use a live lobby for shared play."}
          </p>
        </aside>
      </div>
      {session.error && (
        <p className="error" role="alert">
          {session.error}
        </p>
      )}
      {session.transaction.status && (
        <p className="notice" role="status">
          {session.transaction.status}
        </p>
      )}
      <div className="under-map">
        <p>YOUR MISSION. THEIR NEXT MOVE.</p>
        <span>
          {config.live
            ? "Wallet-owned edits · Public reads · Temporary structures"
            : "SIMULATED — same-browser practice, no onchain evidence"}
        </span>
      </div>
      <Proof session={session} />
      <footer>
        <a href={sessionLink("/crowd", config.live ? config.trust : undefined)}>
          CROWD CONTROL ↗
        </a>
        <span>RIFT RUN / BUILT AT ETHGLOBAL MUMBAI · ARKIV</span>
      </footer>
    </main>
  );
}
