import { EXPLORER, runnableQuery } from "@riftrun/arkiv-adapter";
import type { WorldSession } from "./world-session";
export function Proof({ session }: { session: WorldSession }) {
  const { snapshot, lobbySession, config, stale, error, transaction } = session;
  return (
    <details className="proof">
      <summary>
        Inspect the world <span>↗</span>
      </summary>
      <div className="proof-body">
        <p>
          {config.live
            ? stale
              ? "STALE / UNVERIFIED. Cached structures are not current proof."
              : "Independent reads from Arkiv Rabdi. Latest-state reads are eventually consistent; compare both clients at the same evaluation block and input digest."
            : "SIMULATED practice. Records are local fixtures, not blockchain evidence."}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {config.live && lobbySession && (
          <dl>
            <dt>Lobby key</dt>
            <dd>{lobbySession.lobby.key}</dd>
            <dt>Creator / owner</dt>
            <dd>
              {lobbySession.lobby.creator} / {lobbySession.lobby.owner}
            </dd>
            <dt>Registered roster</dt>
            <dd>{lobbySession.roster.length} wallets</dd>
            <dt>Lobby expiry</dt>
            <dd>{lobbySession.lobby.expiresAt.toString()}</dd>
          </dl>
        )}
        {snapshot && (
          <>
            <dl>
              <dt>Block / phase</dt>
              <dd>
                {snapshot.state.block} / {snapshot.state.phase}
              </dd>
              <dt>World hash</dt>
              <dd>{snapshot.state.worldHash}</dd>
              <dt>Input digest</dt>
              <dd>{snapshot.state.inputHash}</dd>
              <dt>Accepted / rejected</dt>
              <dd>
                {snapshot.state.accepted.length} /{" "}
                {snapshot.state.rejected.length}
              </dd>
            </dl>
            {config.live && (
              <>
                <p>
                  Manifest entity: <code>{snapshot.manifest.key}</code>
                </p>
                <p>
                  <a href={EXPLORER} target="_blank" rel="noreferrer">
                    Open the official explorer ↗
                  </a>{" "}
                  · Use the entity keys below or the reproducible query script.
                </p>
                <pre className="query-code">
                  {runnableQuery(
                    snapshot.manifest.worldId,
                    snapshot.manifest.roundId,
                  )}
                </pre>
              </>
            )}
            {snapshot.state.cells.map((cell) => (
              <div className="proof-record" key={cell.entityKey}>
                <b>
                  {cell.kind} at {cell.x},{cell.y}
                </b>
                <code>Entity {cell.entityKey}</code>
                <code>Creator {cell.creator}</code>
                <code>Effect expires at block {cell.expiresAt}</code>
              </div>
            ))}
            {snapshot.state.rejected.map((rejection) => (
              <p key={rejection.key} className="muted">
                {rejection.key.slice(0, 12)}… {rejection.reason}
              </p>
            ))}
          </>
        )}
        {transaction.status && (
          <p role="status">
            {transaction.status}
            {transaction.hash && (
              <>
                <br />
                <code>{transaction.hash}</code> ·{" "}
                <a href={EXPLORER} target="_blank" rel="noreferrer">
                  Explorer ↗
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </details>
  );
}
