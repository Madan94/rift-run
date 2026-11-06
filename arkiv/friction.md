# Arkiv feedback — observed, not invented

## Bigint block metadata versus number-only duration helper

Environment: Windows, Node 24.21.0, TypeScript 5.9.3, @arkiv-network/sdk 1.0.1. This is a local compiler finding, not a failed onchain transaction.

Expected: a duration stored as bigint alongside block metadata can be passed directly to the block-duration helper, or the helper documentation makes the conversion prominent.

Actual: passing manifest.config.lifetimeBlocks (bigint) to ExpirationTime.fromBlocks fails TypeScript with TS2345: bigint is not assignable to number.

Reproduction:

```ts
import { ExpirationTime } from "@arkiv-network/sdk";
const lifetimeBlocks = 15n;
ExpirationTime.fromBlocks(lifetimeBlocks);
```

Workaround used in the adapter: validate the lifetime to the small protocol range, then Number(lifetimeBlocks). The create operation still uses SDK ExpirationTime, not a hand-built expiry literal. Suggest accepting bounded bigint durations or adding an adjacent metadata-to-duration example.

## Useful behavior and remaining unknowns

- Typed selected fields/metadata and readonly query-result arrays caught mistakes at compile time; copying an array before sorting is explicit and useful.
- Public RPC read-only preflight succeeded, most recently recorded at block 288483. The SDK warns that the unkeyed endpoint is heavily rate limited. We have not observed a measured RPC SLA or a quota-exhaustion response and do not claim either.
- No actual create/expiry benchmark is available yet because the four local test wallets are unfunded. Browser wallet/provider behavior and event indexing lag must be measured after funding.
- Expiry polling, storage extensions and latest-state pagination are explicit in our adapter. This design is informed by the docs; native expiry has not yet been demonstrated in the live game.

Code: packages/arkiv-adapter/src/index.ts. A real transport/indexing finding, if encountered, should be added with exact reproduction, SDK/network/block, expected/actual behavior and a scrubbed log; do not invent one for judging.
