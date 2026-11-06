# RIFT RUN schema v2

Implementation: packages/arkiv-adapter/src/index.ts. SDK 1.0.1, Rabdi chain 7794095. Actual entity examples and writer addresses are pending funded live execution; this file does not claim they exist.

| Named schema | Fields | Indexed filters | Provenance and purpose | Native expiry |
|---|---|---|---|---|
| riftrun.lobby.v2 | worldId:str, roundId:str, protocol:str, capacity:i32, mapHash:str, baseMap:bytes | worldId, roundId | Host creator AND owner, pinned by invite. Readonly layout/task configuration and admission capacity. | 7 days |
| riftrun.member.v2 | worldId:str, roundId:str, lobbyKey:str, player:addr, role:str, maxActive:i32 | worldId, roundId, lobbyKey, player, role | Participant creator = owner = player. Readonly self-registration; grants edit permission only when its exact key is pinned by the host round. | 7 days |
| riftrun.world.v2 | worldId:str, roundId:str, protocol:str, mapHash:str, baseMap:bytes, lobbyKey:str, startBlock:u64, endBlock:u64, phaseBlocks:u64, lifetimeBlocks:u64, activeCap:i32, memberKeys:bytes | worldId, roundId, lobbyKey | Host creator AND owner. Readonly pinned roster, task/map hash and round timing. Earliest host-created round for a lobby is selected canonically. | 7 days |
| riftrun.world-ops.v2 | worldId:str, roundId:str, phase:i32, x:i32, y:i32, kind:str | All six fields | Registered participant creator = owner; readonly geometry/kind. Per-role operations over immutable base map. | 15 blocks, approximately 30 seconds |

All creates use readonly attributes and disable permissionless extension. Readonly does not prevent storage extension, ownership transfer or deletion. Clients revalidate ownership, and cap effects at min(native expiresAt, creation block + configured lifetime, round end). Transferred/mutable/unauthorized records are rejected. Manifest/roster removal or expiry makes the session unverifiable, rather than granting open access.

The map bytes contain bounded grid zones, gaps, legal sites and three checkpoints, hashed canonically. Member-key bytes contain a maximum of 16 keys. Round length is 60 blocks and phase length 5 blocks. Actions apply after confirmed reads; phases validate creation timing, not an atomic lock. An active cap of two candidates per wallet is client policy; invalid/over-budget writes still cost gas.

Query fields also include $key, $creator, $owner, $createdAt, $updatedAt, $expiresAt and $creationFlags. Metadata establishes provenance; a copied arkiv.schema tag does not. Only pinned memberships are authoritative; first valid registrations per wallet form the proposed roster before the host starts.

Runnable query entry point after real session identifiers are configured:

```powershell
Set-Location E:\rift-run
npm.cmd run read:world
```

It emits the exact world/round-filtered raw query used for that session, selected records and canonical hashes. Pagination uses key cursors up to 100 rows/page and a bounded 1200-record scan; inconsistent page blocks/schema mismatches fail visibly. No block-pinned historical read or durable replay of expired operations is claimed.

Offchain: runner physics, task interactions/progress, UI estimates, local practice storage, static code/assets and user interface state. No participant nicknames, private keys, personal details or IPs are placed in Arkiv. Results/scores are not published as verified achievements.

Official references: [schemas](https://docs.arkiv.network/schemas/define/), [creation](https://docs.arkiv.network/writing/create/), [expiry](https://docs.arkiv.network/writing/expiration/), [pagination](https://docs.arkiv.network/querying/paginate/).
