# Why Arkiv

An ordinary Postgres-backed game could deliver lower-latency centralized multiplayer. RIFT RUN uses Arkiv for the smaller durable world-edit layer, not frame-by-frame movement.

## What would users lose with a conventional Postgres replacement?

An ordinary private database replacement would put edit acceptance, ownership metadata, public discovery and availability behind our application service. To preserve the current model we would need to rebuild signed provenance, user-controlled write ownership, public querying and independently enforceable lifetime semantics around that service.

Arkiv provides wallet-owned records on one public query surface. Runner and Crowd initialize separate readers, validate the same versioned schema and host-pinned permissions, and derive the visible structures without a private application database. The host controls roster admission, but signs no participant edits. Replacing Arkiv does not make these features theoretically impossible; it changes who implements and operates their trust/access layer.

## What stays off Arkiv, and why?

Movement, collision, task interaction/progress and UI animations remain local because they need frame-rate responsiveness and are not shared authoritative chain records. Practice is visibly browser-local simulation. No nicknames, IPs or personal identity data are stored onchain. Local scores are not cheat-proof attestations.

Native expiry removes temporary operations from queries. Clients poll blocks and cap effective lifetimes; they do not assume expiration events. Confirmation delays, gas, public metadata, RPC quota, owner extensions and eventually consistent reads are visible tradeoffs. Configuration is host-pinned and readonly, but records can still be transferred/deleted/extended; clients validate metadata each refresh.

Evidence still required: funded independent writers, fresh-client reconstruction, a real temporary bridge disappearing, and hash comparison for identical inputs/evaluation blocks. Unit tests are not substituted for that live demonstration. See docs/evidence.md.
