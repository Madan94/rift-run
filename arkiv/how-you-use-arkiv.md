# How RIFT RUN uses Arkiv

Implementation: packages/arkiv-adapter/src/index.ts and packages/world-protocol/src/index.ts. SDK 1.0.1, protocol/schema v2, Rabdi. This describes implemented behavior; real write/expiry evidence is still pending funding.

| Arkiv feature | Visible behavior | Implementation / required proof |
|---|---|---|
| Filtered queries | A world/round invite loads only relevant candidate structures and registered writers | Indexed worldId, roundId, lobbyKey, phase, coordinates and kind; metadata creator filters and key pagination. Capture an actual query after the spike. |
| Wallet ownership | Each participant signs registration and edits, with creator/owner shown in the inspector | Real $creator/$owner validation and host-pinned registration keys. Record three actual writer addresses and transactions; none are currently claimed. |
| Expiration | Bridges/walls stop affecting traversable routes after their lifetime | Native 15-block expiry plus bounded effective expiry. Record query and gameplay before/after the actual native cutoff. |
| Public shared records | Runner and Crowd independently derive matching structures | Separate reader initialization, deterministic reducer, input/world digests and fresh loading. Compare at identical normalized inputs and evaluation block. |

## Do the semantics fit the game?

World/round filtering isolates rounds; wallet ownership attributes each intervention and separates host admission from participant signing; expiry keeps interventions temporary. A central bridge shortens the build-to-mentor route, while its absence restores the detour. Local route tests verify the geometry; real native expiration in gameplay still needs proof.

Two active candidates per wallet, pinned roles and safe site geometry are application policy, not Arkiv enforcement. Conflict losers can consume capacity and later reappear; the inspector shows rejected reasons. Metadata updates and latest-state queries can temporarily diverge across clients, so hashes are compared only after matching input/checkpoint observations.

## Reproduce

1. Complete local funding/access-key setup in plan.md.
2. Run npm run preflight, then npm run spike.
3. Inspect actual .local/live-evidence.json and public session identifiers.
4. Run npm run read:world and open both website views using the same pinned invite.
5. Add the successful writer/entity/transaction keys, measured expiry blocks, displayed hashes and demo timestamps here. They are intentionally absent until real execution.

The game never treats a wallet prompt or transaction receipt alone as visible-world confirmation. Queries and policy validation determine applied structures. Simulation, cached/stale reads and local gameplay remain explicitly labeled.
