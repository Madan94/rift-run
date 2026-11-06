# Evidence and remaining acceptance

As of the v2 implementation on 6 November 2026:

| Evidence class | Observed result |
|---|---|
| TypeScript | Pass on current source before documentation changes |
| Unit/domain tests | 38 tests pass, including deterministic permutations, roster, task, invite isolation and route-impact checks |
| Production build | One Vite static build produced home/play/crowd entry files; final release build is checked again before packaging |
| Local HTTP | /play and /crowd both returned HTTP 200 from one server on port 5173 |
| Rabdi read-only transport | Preflight observed block 288483; not entity-write evidence |
| Script wallet balances | All four were 0 tGLM at that preflight |
| Access key | Absent at that preflight |
| Real RIFT RUN entity writes | NOT EXECUTED / BLOCKED BY FUNDING |
| Real native expiry | NOT VERIFIED |
| Browser/phone gameplay | NOT VERIFIED; prior CUA browser host/URL verification was unavailable |
| Public deployment | Target registered; native terminal deployment result is required before claiming publication |
| Participant counts / feedback | No measured human attendance or feedback recorded |

The three-writer spike saves actual transactions/keys incrementally in ignored .local/live-evidence.json. After a successful run, publish a scrubbed evidence excerpt with real writer addresses, manifest/lobby keys, query, before/after expiry blocks and world/input hashes. Preserve incomplete attempts honestly. Do not replace missing evidence with fixtures.

For browser comparison, use the same pinned invite, wait for both readers to converge, then record each evaluation block, complete input digest and world hash. Identical latest head numbers alone are insufficient. A fresh query reconstructs the current active world, not expired history or offchain runner progress.
