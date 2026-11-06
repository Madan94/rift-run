import { EXPLORER } from "@riftrun/arkiv-adapter";
import type { WorldSession } from "./session";
export function Proof({ session }: { session: WorldSession }) {
  const { snapshot, config, stale, error, transaction } = session;
  return <details className="proof"><summary>Inspect the world <span>↗</span></summary><div className="proof-body">
    <p>{config.live ? stale ? "STALE / UNVERIFIED — waiting for a consistent read. Cached structures are not current proof." : "Independent reads from Arkiv Rabdi. Compare both clients at the same block and input digest." : "SIMULATED practice. These records are local fixtures, not blockchain evidence."}</p>
    {error && <p className="error" role="alert">{error}</p>}
    {snapshot && <><dl><dt>Block / phase</dt><dd>{snapshot.state.block} / {snapshot.state.phase}</dd><dt>World hash</dt><dd>{snapshot.state.worldHash}</dd><dt>Input digest</dt><dd>{snapshot.state.inputHash}</dd><dt>Accepted / rejected</dt><dd>{snapshot.state.accepted.length} / {snapshot.state.rejected.length}</dd></dl>
      {config.live && <a href={`${EXPLORER}/entity/${snapshot.manifest.key}`} target="_blank" rel="noreferrer">Manifest in explorer ↗</a>}
      {snapshot.state.cells.map(c => <div className="proof-record" key={c.entityKey}><b>{c.kind} at {c.x},{c.y}</b><code>Creator {c.creator}</code><code>Expires at block {c.expiresAt}</code>{config.live && <a href={`${EXPLORER}/entity/${c.entityKey}`} target="_blank" rel="noreferrer">Entity ↗</a>}</div>)}
      {snapshot.state.rejected.map(r => <p key={r.key} className="muted">{r.key.slice(0, 12)}… {r.reason}</p>)}
    </>}
    {transaction.status && <p role="status">{transaction.status}{transaction.hash && <> · <a href={`${EXPLORER}/tx/${transaction.hash}`} target="_blank" rel="noreferrer">Transaction ↗</a></>}</p>}
  </div></details>;
}
