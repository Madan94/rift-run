import { useEffect, useState } from "react";
import { VENUE, type Role } from "@riftrun/world-protocol";
import { VenueMap } from "../../shared/VenueMap";
import { Proof } from "../../shared/Proof";
import { sessionLink, useWorld } from "../../shared/world-session";

export default function Crowd() {
  const session = useWorld();
  const map =
    session.snapshot?.manifest.map ?? session.lobbySession?.lobby.map ?? VENUE;
  const [team, setTeam] = useState<Role>("BUILDER");
  const [selected, setSelected] = useState("central-rift");
  const fixedRole = session.member?.role ?? session.registration?.role;
  const role = fixedRole ?? team;
  useEffect(() => {
    const kind = role === "BUILDER" ? "BRIDGE" : "WALL";
    if (!map.sites.some((site) => site.id === selected && site.kind === kind))
      setSelected(map.sites.find((site) => site.kind === kind)!.id);
  }, [role, map, selected]);
  const site = map.sites.find((value) => value.id === selected) ?? map.sites[0];
  const chooseTeam = (value: Role) => {
    if (!fixedRole) setTeam(value);
  };
  const locked = Boolean(session.snapshot);
  const funded = session.balance !== null && session.balance > 0n;
  const canRegister = Boolean(
    session.account &&
      funded &&
      !session.registration &&
      !locked &&
      !session.stale &&
      !session.busy &&
      session.lobbySession &&
      session.lobbySession.roster.length < session.lobbySession.lobby.capacity,
  );
  const canPublish = !session.config.live
    ? session.practiceRunning
    : Boolean(
        session.member &&
          funded &&
          session.roundOpen &&
          !session.stale &&
          !session.busy,
      );
  return (
    <main className="crowd-shell">
      <header className="masthead">
        <a className="wordmark" href="/">
          RIFT<span>↗</span>RUN
        </a>
        <span className="event-lockup">
          <b>CROWD CONTROL</b>
          <span>MUMBAI / 2026</span>
        </span>
      </header>
      <div className="crowd-heading">
        <div className="eyebrow">YOUR WALLET. YOUR INTERVENTION.</div>
        <h1>
          Help them.
          <br />
          <em>Or make it harder.</em>
        </h1>
        <p>
          {session.config.live
            ? "Connect, register your team, then publish your own temporary edits to Arkiv."
            : "SIMULATED practice. Edits sync with /play in another tab of this browser. No wallet transaction is made."}
        </p>
      </div>
      {session.config.live && (
        <section className="onboarding-panel">
          <div>
            <span className="eyebrow">
              {locked ? "ROSTER LOCKED" : "JOIN THE NEXT RUN"}
            </span>
            <b>
              {session.lobbySession?.roster.length ?? 0} /{" "}
              {session.lobbySession?.lobby.capacity ?? 16} registered wallets
            </b>
          </div>
          <button className="button-primary" onClick={session.connect}>
            {session.account
              ? session.account.slice(0, 6) + "…" + session.account.slice(-4)
              : "CONNECT WALLET ↗"}
          </button>
          {session.account && (
            <p>
              {session.balanceLabel} ·{" "}
              {funded ? (
                "Ready to sign on Rabdi"
              ) : (
                <a
                  href="https://hub.arkiv.network/faucet"
                  target="_blank"
                  rel="noreferrer"
                >
                  Get test tGLM ↗
                </a>
              )}
            </p>
          )}
          <p className="fine-print">
            {fixedRole
              ? "Your team is fixed for this round: " + fixedRole + "."
              : locked
                ? "This round has started. Wallets outside its roster must join the next lobby."
                : "Registration is one wallet-owned transaction. The host locks the roster before the round. Late joins enter the next round."}
          </p>
        </section>
      )}
      <div className="team-switch" aria-label="Choose your team">
        <button
          className={role === "BUILDER" ? "active builder" : ""}
          disabled={Boolean(fixedRole)}
          aria-pressed={role === "BUILDER"}
          onClick={() => chooseTeam("BUILDER")}
        >
          <span>＋</span>
          <b>BUILDERS</b>
          <small>Open a shortcut</small>
        </button>
        <button
          className={role === "BREAKER" ? "active breaker" : ""}
          disabled={Boolean(fixedRole)}
          aria-pressed={role === "BREAKER"}
          onClick={() => chooseTeam("BREAKER")}
        >
          <span>×</span>
          <b>BREAKERS</b>
          <small>Make them take the long way</small>
        </button>
      </div>
      {session.config.live && !session.registration && !locked && (
        <button
          className="button-primary register-button"
          disabled={!canRegister}
          onClick={() => session.register(team)}
        >
          {session.busy ? "WAITING FOR WALLET…" : "REGISTER AS " + team + " ↗"}
        </button>
      )}
      <section className="crowd-map-panel">
        <div className="map-topline">
          <span>PICK A CORRIDOR</span>
          <span className="status-inline">
            {session.config.live
              ? session.stale
                ? "STALE / UNVERIFIED"
                : "ARKIV READ CONFIRMED"
              : "SIMULATED MAP"}
          </span>
        </div>
        <VenueMap
          map={map}
          cells={session.snapshot?.state.cells ?? []}
          selected={selected}
          compact
          onSelect={(id) => {
            const target = map.sites.find((value) => value.id === id);
            if (target?.kind === (role === "BUILDER" ? "BRIDGE" : "WALL"))
              setSelected(id);
          }}
        />
      </section>
      <section className="action-panel">
        <div className="eyebrow">
          {role === "BUILDER"
            ? "＋ CREATE A TEMPORARY BRIDGE"
            : "× CREATE A TEMPORARY WALL"}
        </div>
        <div className="site-choices">
          {map.sites
            .filter(
              (value) =>
                value.kind === (role === "BUILDER" ? "BRIDGE" : "WALL"),
            )
            .map((value) => (
              <button
                key={value.id}
                className={value.id === selected ? "selected" : ""}
                aria-pressed={value.id === selected}
                onClick={() => setSelected(value.id)}
              >
                {value.label}
                <span>
                  {value.x},{value.y}
                </span>
              </button>
            ))}
        </div>
        <h2 className="edit-title">{site.label}</h2>
        <p className="fine-print">
          {site.kind === "BRIDGE"
            ? "Create a crossing through the rift. It disappears when its lifetime ends."
            : "Block this corridor temporarily. A safe alternate route remains available."}{" "}
          Each wallet can have at most two active candidate edits, including
          conflict losers.
        </p>
        <button
          className="button-primary commit-button"
          disabled={!canPublish}
          onClick={() => session.publish(site.id)}
        >
          {session.busy
            ? "WAITING FOR WALLET…"
            : session.config.live
              ? "SIGN & PUBLISH " + site.kind + " ↗"
              : "SUBMIT SIMULATED " + site.kind + " ↗"}
        </button>
        {!session.config.live && !session.practiceRunning && (
          <p className="notice">
            Start a round in{" "}
            <a href="/play?mode=practice" target="_blank" rel="noreferrer">
              Runner practice ↗
            </a>
            , then return here.
          </p>
        )}
        {session.config.live && !session.member && locked && (
          <p className="notice">
            This wallet is not in the locked roster. Ask the host for the next
            round invite.
          </p>
        )}
        {session.startsIn > 0 && (
          <p className="notice">
            Round starts in approximately {session.startsIn} seconds.
          </p>
        )}
        {session.transaction.status && (
          <p className="notice" role="status">
            {session.transaction.status}
          </p>
        )}
        {session.error && (
          <p className="error" role="alert">
            {session.error}
          </p>
        )}
        <p className="fine-print">
          {session.config.live
            ? "Your wallet signs every edit. Transaction inclusion is followed by a real Arkiv read; conflicts and policy checks can still prevent an edit from applying. No votes or relayer."
            : "Practice records are browser-local fixtures, not onchain proof. Actual writes require a funded wallet and a live lobby."}
        </p>
      </section>
      <Proof session={session} />
      <footer>
        <a
          href={sessionLink(
            "/play",
            session.config.live ? session.config.trust : undefined,
          )}
        >
          OPEN RUNNER ↗
        </a>
        <span>Powered by Arkiv ↗</span>
      </footer>
    </main>
  );
}
