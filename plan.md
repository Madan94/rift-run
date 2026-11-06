# RIFT RUN — next-stage plan

**Status: IMPLEMENTED AND PUBLISHED. User approved this plan; native Sites publication succeeded. Live Arkiv acceptance is blocked by test-wallet funding and missing access-key setup. Browser verification remains open.**

Updated: 6 November 2026 (IST). Deadline: **7 November 2026, 09:00 IST**. Target submission: **08:00 IST**. Track: **Arkiv — Build on Arkiv (from scratch)**.

This plan supersedes badge collection and designated-editor voting. The original brief in docs/project-context.md remains historical context; its Sunday deadline and superseded features do not control this build.

## 1. Confirmed decisions

| User decision | Next-stage behavior |
|---|---|
| Every participant publishes their edits | Each participant connects a funded Rabdi wallet and personally signs their world edits. |
| One website | One development origin and public deployment: /play for the Runner, /crowd for participants. |
| Keep the venue | Preserve the recognizable Mumbai map and top-down movement. |
| Replace badges with checkpoint tasks | Complete a short venue mission, then reach Main Stage. |
| Help with Arkiv setup | Include access-key creation, test funding, onboarding and actual live evidence. |

## 2. Current baseline and evidence

| Area | Current state | Evidence / remaining limit |
|---|---|---|
| Repository scaffold | Implemented | npm workspaces, TypeScript, lockfile, MIT license and ignored .env. |
| Shared protocol | v2 implemented and unit-tested | Self-owned registrations, fixed roster, provenance, phases, expiry, caps, conflicts and hashes. |
| Arkiv adapter | v2 implemented; live writes unproven | Lobby, registration, round discovery/start, participant signing, direct queries and updated spike. |
| Runner | Checkpoint mission implemented | Check-in, three-second build, mentor review and stage delivery; actual browser gameplay remains unverified. |
| Crowd Editor | Direct-wallet UI implemented | Registration/publishing states and same-browser shared simulated edits. |
| Guest vote service | Unused historical source | Not required by the release website. |
| Automated checks | Passing | Typecheck and **38 tests** pass, including task rules, roster freeze, invite isolation, simulation and actual route shortening. |
| Production builds | One-site build and publication pass | Root dist includes /, /play/ and /crowd/. Initial native publication from 68fd4d7 succeeded; see docs/evidence.md. |
| Rabdi RPC | Read-only request succeeded | Preflight observed block **288483**; not write/expiry proof. |
| Access key | Missing | No key configured. |
| Four script wallets | Present, unfunded | Preflight reports **0 tGLM in all four**. Keys remain in ignored local .env. |
| Git history | Baseline preserved | Commit 8f46396 captures the initial prototype; v2 implementation is committed before deployment. |
| Judging materials | Evidence-aware drafts written | README, five Arkiv files, AI disclosure and evidence status. Actual chain keys, human feedback, video and submission remain pending. |

Checkboxes mean verified completion. Keep local, browser and real-chain evidence separate.

## 3. Agreed checkpoint mission

Keep a two-minute round. In live mode, time is estimated from the pinned round's blocks. One runner starts at Entry; Builders and Breakers alter useful routes through temporary Arkiv structures.

| Order | Checkpoint | Task | Completion rule |
|---|---|---|---|
| 1 | Registration / Help Desk approach | **Check in** | Enter the marked zone and press E / tap Interact. |
| 2 | Hacking Space West entrance | **Build the demo** | Hold Interact for three seconds; leaving resets unfinished progress. Receive a demo packet. |
| 3 | Mentor Station approach | **Get the review** | Deliver the packet and interact. Requires task 2. |
| Finish | Main Stage | **Pitch the demo** | Reach the finish with the reviewed packet before time expires. |

- Show ordered task progress, current objective, map markers and interaction prompts.
- Author protected interaction points in walkable corridors beside landmarks.
- Keyboard: WASD/arrows + E. Touch: directional controls + a large Interact button.
- Movement and task progress remain offchain local gameplay. Do not claim a verified onchain score or cheat-proof mission.
- BRIDGE opens a crossing; WALL blocks one legal cell. Edits must change a meaningful route/task approach while preserving an alternate route and safe respawn.
- Pause movement and interaction progress during stale live reads. Reaching Main Stage early does not win.
- Task details were approved by the user before this implementation.

## 4. Participant onboarding and authorization

The v2 code replaces v1 host-created memberships with a **wallet lobby followed by a fixed roster for each round**:

1. Host creates a lobby with world/round identifiers and pinned host identity.
2. Participant opens /crowd, connects their wallet, switches to Rabdi and chooses a team.
3. Check test funding and link to the faucet when needed; automatic gas sponsorship is outside scope.
4. Participant signs a readonly, wallet-owned registration. Verify creator = owner = registered player and the intended lobby/round.
5. Host reads valid registrations and signs one immutable round manifest pinning their exact entity keys, roles, map/task configuration and a future start block.
6. Roster members publish their edits; **the host never signs or approves individual participant edits**.
7. Late joins and role changes enter the next round. Explain this before requesting a transaction.

Agreed initial capacity: **16 wallets per round**, with visible capacity/waiting state. First prove three participant wallets; measure RPC quota before raising capacity. Capacity is not measured human turnout.

Protocol requirements:

- Version changed membership/manifest semantics; do not silently reinterpret v1 memberships.
- Self-registration alone grants no authority: its exact key/role must be pinned by the trusted host manifest.
- Fix roles per round. Builders publish bridges; Breakers publish walls.
- Validate creator/owner, readonly flags, creation blocks, pinned configuration and native/effective expiry in each client.
- Cap currently active operations. Expiry frees capacity; this is not a historical round budget.
- Retain losing candidates for reconciliation; explain conflict loss and active-budget rejection.
- Distinguish signing, transaction included, awaiting read, active, conflict lost, invalid and expired. Only actual reads can produce confirmed world changes.
- Use creation blocks for phases. Explain boundary failures; never silently retry a write as a second transaction.
- Apply valid edits after confirmed reads. Phase labels describe acceptance windows; do not promise visual batching unless implemented.
- Refresh expiry independently of animations. Bound effects by creation block and round end, including owner extensions.
- Rematches create fresh pinned rounds. Never reuse an ended round silently.

## 5. One website, two independent world readers

- Consolidate into one Vite project with /play and /crowd entry points and a small / role selector. Retain shared protocol/adapter packages.
- One npm run dev, one origin and one deployable static build; load Phaser only for the Runner entry.
- Generate same-origin links/QR from the actual deployment plus pinned session parameters. Audience QR codes must not contain localhost.
- Both views initialize their own Arkiv readers. Neither gets authoritative structures from the other's memory or a game database.
- Expose input/world hashes and creator/expiry inspection. Compare the same normalized inputs and evaluation block.
- Remove guest voting/designated-publisher copy from the release path. Existing vote-service source can remain unused historical work.
- Show registered roster size, not claimed live attendance. Presence and runner-position streaming are deferred offchain features.
- Preserve visibly SIMULATED practice. Independent per-tab fixtures must not be advertised as shared play. A synchronized practice backend is a stretch, not a live-release prerequisite.

## 6. Access key and funding setup

Official sources checked on 6 November 2026: [access-key guide](https://docs.arkiv.network/start-here/access-keys/), [Hub keys](https://hub.arkiv.network/access-keys), [faucet](https://hub.arkiv.network/faucet), [Rabdi network](https://docs.arkiv.network/networks/rabdi/) and [browser signing](https://docs.arkiv.network/start-here/clients/).

1. Open Hub access keys, connect your wallet and sign its sign-in message. Complete registration if prompted.
2. Choose **Rabdi**, name the project **RIFT RUN**, complete the CAPTCHA and generate the key. These are user-operated wallet/account steps.
3. Put it in ARKIV_ACCESS_KEY in the existing ignored E:\rift-run\.env. Never paste keys into chat, overwrite wallet fields or regenerate the existing script wallets.
4. Browser reads use VITE_ARKIV_ACCESS_KEY. Visitors can see this value: configure Origins for the actual local/deployed origins. Origin restrictions attribute quota usage; they are not an access-control boundary. Never put a keyed RPC URL in wallet chain settings.
5. Fund dedicated test accounts through the faucet's current claim flow. The Hub states one claim per wallet per cooldown window. Do not assume unlimited claims, arbitrary recipient support or an exact amount. If only the connected account can claim, use that test account locally or ask the Arkiv booth for test-token assistance.
6. Fund the host and three actual participant wallets for the first demo. Attendees keep their own keys and need their own balances. Script wallets are integration tools, not attendee accounts.
7. Verify with the existing command below. An access key supplies RPC quota; **tGLM in each wallet pays transaction gas**.

Run in PowerShell:

    Set-Location E:\rift-run
    npm.cmd run preflight

Local script addresses below were observed at zero tGLM. **They have not written RIFT RUN entities yet.**

| Role | Public address |
|---|---|
| Host | 0xa1cd4ac2D5eA5dB2fe288FC727A667B681678aAC |
| Writer A | 0x6fa0541D1C42e986c2CAa4683BeF04545594b9C0 |
| Writer B | 0x40B3A0F9f03226Cc112bC002e58E2fd421502772 |
| Writer C | 0xaE4DAB05b41312fD123662D7B2E7DD9b2D94796A |

## 7. Trackable implementation milestones

### P0 — preserve baseline and unblock Arkiv

- [x] Inspect current source and refresh typecheck/unit-test evidence.
- [x] Verify setup instructions and funding blockers.
- [x] Record user choices and prepare this review plan.
- [x] User reviews checkpoint tasks, lobby policy and scope.
- [x] Make a meaningful baseline Git commit without secrets/build output (8f46396; staged secret scan passed).
- [ ] User configures the access key and funds test accounts; preflight passes.
- [ ] Prove one entity create/read and capture actual key, transaction, creator, owner and expiry.

**Acceptance:** real read-back is recorded; script proof is not described as a completed live game.

### P1 — participant-owned registration and live edits

- [x] Version and implement lobby, self-registration and immutable roster configuration (v2 types and domain tests).
- [x] Implement host start/rematch controls gated by the host wallet (source/typechecked; browser acceptance pending).
- [x] Implement participant signing for authorized operations (source/typechecked; real transactions pending).
- [x] Implement indexer lag, scan/phase errors, expiry and stale-state handling; local tests pass.
- [x] Update spike scripts for self-owned registration and serialized incremental evidence saving.

**Acceptance:** three distinct writers, filtered read-back, deterministic conflicts and observed native expiry. Browser confirmation is recorded separately from script proof.

### P2 — consolidate the website

- [x] One origin/build for /, /play and /crowd; local HTTP 200 checks and static route artifacts pass.
- [x] Implement same-origin QR/navigation and wallet change handling; phone/provider acceptance pending.
- [x] Implement wallet-first Crowd UI with balance, role, site and transaction/read status.
- [x] Independent reader code and local matching-hash tests; actual browser/Rabdi comparison remains open in P4.
- [x] Remove voting/publisher requirements from the release path.

**Acceptance:** both views work from one website; no guest vote server is required to reconstruct the Arkiv world.

### P3 — checkpoint mission

- [x] Replace badge collectibles, counters and instructions with the agreed tasks.
- [x] Add tested task order, interaction zones, hold/reset behavior and stage completion.
- [x] Implement keyboard/touch prompts and objective/map feedback; browser layout acceptance pending.
- [x] Verify central bridge shortens the route by more than 10 tiles and all legal wall sets preserve task access.
- [x] Correct practice idle/start/shared-tab/rematch rules and pause behavior in local tests; live timing code uses the pinned round.

**Acceptance:** tasks cannot be skipped or completed remotely; paused gameplay cannot advance; Main Stage requires all tasks; a crowd edit changes a traversal decision.

### P4 — verify, deploy and prepare submission

- [x] Extend local tests for forged/self-owned registration, roster freeze, late joins, roles and practice rematches.
- [x] Test checkpoint ordering, progress reset, pause, timeout and finish; actual movement/respawn needs browser smoke.
- [ ] Browser smoke: movement/mission, publishing, rejection, account changes and direct route reload.
- [ ] Verify 390 px mobile layout and projector readability. Prior automation stopped at browser URL verification; obtain actual supported/manual evidence rather than claiming a pass.
- [ ] Rabdi proof: three writers, conflict, before/after native expiry, fresh clients and matching input/world hashes.
- [ ] Measure confirmation/read delay and quota behavior; state observed limits.
- [x] Public HTTPS deployment: native Sites reports succeeded, public audience, one origin with /play and /crowd.
- [ ] Verify the actual phone QR and wallet flow.
- [x] Replace README stub with setup, runnable query entry point, architecture, limits and asset/AI credits. Actual writer addresses stay explicitly pending.
- [x] Write all five Arkiv documents with actual local findings and honest missing evidence.
- [ ] Fill real writer/entity/transaction keys, native expiry evidence, measured reach and demo timestamps after live execution.
- [ ] Record human-narrated 2–4 minute >=720p demo; no speed-up or synthetic voice.
- [ ] User submits to ETHGlobal with Arkiv selected; verify submitted state before deadline.

**Acceptance:** a judge opens one URL, plays/watches the mission, publishes a wallet-owned intervention, inspects provenance and observes expiry. No fabricated users, transactions or integration successes.

## 8. Visual direction and boundaries

- Keep the venue composition and burgundy/cream/cyan/orange/green palette.
- Preserve the map-first layout, strong title, large timer and readable controls.
- Replace the voting panel with direct-wallet participation and roster/round status.
- Use simple task icons/progress; no broad redesign or new image-generation dependency.
- Game adaptation only, not official accessibility, navigation or emergency guidance.
- No tokens, payments, unrelated sponsors, automatic gas sponsorship, personal information onchain or anti-Sybil/cheat-proof claims.

## 9. Time gates and review boundary

1. **Now:** approved implementation is complete locally. Finish public deployment/verification and unblock funded live testing.
2. Live criteria remain unchecked until actual onchain and real-device evidence exists.
3. **By 06:00 IST on 7 November:** feature freeze. Preserve the live edit/read/expiry loop, one website and a small checkpoint mission.
4. **06:00–08:00 IST:** deployment checks, evidence, documentation, recording and submission.
5. **08:00–09:00 IST:** upload/form buffer. Deadline: **09:00 IST**.

Scope cuts: synchronized practice backend, online presence, extra powers, standalone inspector, animation polish and elaborate scoring. Preserve direct-wallet participation and the checkpoint mission.

**Next external action: obtain the Rabdi access key and fund the test wallets using section 6, then run preflight/spike and a real-device live round.**
