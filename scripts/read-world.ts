import { canonical } from "@riftrun/world-protocol";
import { loadWorld, runnableQuery } from "@riftrun/arkiv-adapter";
import { fail, reader, retry } from "./env";
try {
  const snapshot = await retry(() => loadWorld(reader(), { worldId: process.env.VITE_RIFTRUN_WORLD_ID ?? "", host: process.env.VITE_RIFTRUN_HOST_ADDRESS ?? "", manifestKey: process.env.VITE_RIFTRUN_MANIFEST_ENTITY_KEY ?? "" }));
  console.log(runnableQuery(snapshot.manifest.worldId, snapshot.manifest.roundId));
  console.log(canonical({ manifestKey: snapshot.manifest.key, writerAddresses: snapshot.members.map(m => m.player), operations: snapshot.operations, state: snapshot.state }));
} catch (error) { fail(error); }
