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
| Public deployment | Native Sites deployment succeeded at 16:58 IST on 6 November 2026; public audience enabled. This verifies hosting, not browser/game/Arkiv behavior. |
| Participant counts / feedback | No measured human attendance or feedback recorded |

The three-writer spike saves actual transactions/keys incrementally in ignored .local/live-evidence.json. After a successful run, publish a scrubbed evidence excerpt with real writer addresses, manifest/lobby keys, query, before/after expiry blocks and world/input hashes. Preserve incomplete attempts honestly. Do not replace missing evidence with fixtures.

## Verified initial publication

- URL: https://rift-run-mumbai-2026.madhanxdev.chatgpt.site
- Source commit: 68fd4d72615c49f99bf02630010044da1dfbf872
- Native saved version: appgprj_6aedb2bbf43081918cc0ee56f357223e~appgver_c828899229388191822d753704b7c3fe
- Native deployment: appgdep_6aedb9c9a254819194f0083c27688a4d
- Terminal status: succeeded; failure_message: null; audience: public.
- Home/play/crowd static entry files were packaged from the checked source. Home/Crowd do not preload Phaser; a shared runtime helper has its own small chunk.
- Source and artifact scans exclude private wallet keys. A backend deployment success does not replace manual browser or wallet testing.

For browser comparison, use the same pinned invite, wait for both readers to converge, then record each evaluation block, complete input digest and world hash. Identical latest head numbers alone are insufficient. A fresh query reconstructs the current active world, not expired history or offchain runner progress.
