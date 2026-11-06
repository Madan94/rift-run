import { useState, type FormEvent } from "react";
import { ADDRESS, ENTITY_KEY } from "@riftrun/world-protocol";
import {
  connectBrowser,
  createBrowserWriter,
  createLobby,
  createReader,
  safeError,
} from "@riftrun/arkiv-adapter";
import { sessionConfig, sessionLink } from "../../shared/world-session";
export default function Home() {
  const config = sessionConfig();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");
  const create = async () => {
    if (!window.ethereum) {
      setError(
        "Open this site in a wallet browser or install an Ethereum-compatible desktop wallet extension.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const actor = await connectBrowser(window.ethereum);
      const reader = createReader(import.meta.env.VITE_ARKIV_ACCESS_KEY ?? "");
      if ((await reader.getBalance({ address: actor })) === 0n)
        throw new Error(
          "The host wallet needs test tGLM from the Rabdi faucet before creating a lobby.",
        );
      const lobby = await createLobby(
        createBrowserWriter(window.ethereum, actor),
      );
      location.assign(
        sessionLink("/play", {
          worldId: lobby.worldId,
          lobbyKey: lobby.entityKey,
          host: actor,
          manifestKey: "",
        }),
      );
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setBusy(false);
    }
  };
  const join = (event: FormEvent) => {
    event.preventDefault();
    try {
      const url = new URL(invite, location.origin);
      const worldId = url.searchParams.get("world") ?? "";
      const lobbyKey = url.searchParams.get("lobby") ?? "";
      const host = url.searchParams.get("host") ?? "";
      if (
        !/^[a-zA-Z0-9_-]{1,96}$/.test(worldId) ||
        !ENTITY_KEY.test(lobbyKey) ||
        !ADDRESS.test(host)
      )
        throw new Error(
          "Paste a complete live invite with world, lobby and host identifiers.",
        );
      location.assign(
        sessionLink("/crowd", { worldId, lobbyKey, host, manifestKey: "" }),
      );
    } catch (caught) {
      setError(safeError(caught));
    }
  };
  return (
    <main className="home-shell">
      <header className="masthead">
        <a className="wordmark" href="/">
          RIFT<span>↗</span>RUN
        </a>
        <div className="event-lockup">
          <span>ETHGLOBAL</span>
          <b>MUMBAI / 2026</b>
        </div>
        <span className="status">
          <i /> BUILT ON ARKIV
        </span>
      </header>
      <section className="home-intro">
        <span className="eyebrow">ONE VENUE. A CROWD OF POSSIBILITIES.</span>
        <h1>
          Get your demo
          <br />
          <em>to the stage.</em>
        </h1>
        <p>
          One runner races through the venue. Everyone else can open a
          shortcut—or put a wall in the way. Each live intervention belongs to
          the wallet that signs it.
        </p>
      </section>
      <div className="role-cards">
        <a href={sessionLink("/play", config.live ? config.trust : undefined)}>
          <span>01 / RUNNER</span>
          <h2>Make the run.</h2>
          <p>
            Check in. Build your demo. Get a review. Reach Main Stage before
            time runs out.
          </p>
          <b>OPEN RUNNER ↗</b>
        </a>
        <a href={sessionLink("/crowd", config.live ? config.trust : undefined)}>
          <span>02 / CROWD</span>
          <h2>Change the route.</h2>
          <p>
            Choose Builder or Breaker. In a live lobby, connect a funded wallet
            and publish your own edits.
          </p>
          <b>OPEN CROWD CONTROL ↗</b>
        </a>
      </div>
      <p className="practice-note">
        {config.live
          ? "These links retain your pinned live session."
          : "These links open SIMULATED practice. Same-browser tabs share practice edits; phone browsers need a live lobby to share the world."}
      </p>
      <section id="host" className="host-setup">
        <div>
          <span className="eyebrow">READY FOR THE REAL WORLD?</span>
          <h2>Host a live round.</h2>
          <p>
            Create a wallet-owned Arkiv lobby, share its Crowd QR, and start
            when participants have registered. Every participant needs test tGLM
            and signs their own edits.
          </p>
          <button className="button-primary" disabled={busy} onClick={create}>
            {busy ? "WAITING FOR WALLET…" : "CREATE ARKIV LOBBY ↗"}
          </button>
          <p className="fine-print">
            <a
              href="https://hub.arkiv.network/faucet"
              target="_blank"
              rel="noreferrer"
            >
              Get test tGLM ↗
            </a>{" "}
            ·{" "}
            <a
              href="https://hub.arkiv.network/access-keys"
              target="_blank"
              rel="noreferrer"
            >
              Developer RPC access key ↗
            </a>
          </p>
        </div>
        <form onSubmit={join}>
          <label htmlFor="invite">Already have a live invite?</label>
          <textarea
            id="invite"
            value={invite}
            onChange={(event) => setInvite(event.target.value)}
            placeholder="Paste the host’s live Crowd invite"
            rows={4}
          />
          <button className="button-secondary" type="submit">
            JOIN THAT LOBBY ↗
          </button>
          <p className="fine-print">
            Roster locks before each round. Late arrivals join the next round.
          </p>
        </form>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <span>RIFT RUN / A GAME ADAPTATION OF THE MUMBAI VENUE</span>
        <span>
          Independent reads. Wallet-owned edits. Temporary structures.
        </span>
      </footer>
    </main>
  );
}
