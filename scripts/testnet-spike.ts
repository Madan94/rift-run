import { mkdir, writeFile } from "node:fs/promises";
import {
  createLobby,
  createScriptWriter,
  loadLobbySession,
  loadWorld,
  registerParticipant,
  publishOperation,
  runnableQuery,
  startRound,
} from "@riftrun/arkiv-adapter";
import { canonical } from "@riftrun/world-protocol";
import { accounts, fail, reader, retry } from "./env";

try {
  const wallets = accounts();
  if (new Set(wallets.map((a) => a.address)).size !== 4)
    throw new Error(
      "Four distinct test wallets are required for the multi-writer spike",
    );
  const client = reader();
  const balances = await Promise.all(
    wallets.map((a) => client.getBalance({ address: a.address })),
  );
  if (balances.some((b) => b === 0n))
    throw new Error(
      "BLOCKED: one or more wallets have no tGLM. Fund each address through the official faucet.",
    );
  const writers = wallets.map((a) =>
    createScriptWriter(a, process.env.ARKIV_ACCESS_KEY ?? ""),
  );
  const lobby = await createLobby(writers[0]);
  const { worldId, roundId } = lobby;
  const evidence: Record<string, unknown> = {
    status: "IN PROGRESS — not full proof",
    network: "Rabdi",
    chainId: 7794095,
    sdk: "1.0.1",
    worldId,
    roundId,
    host: wallets[0].address,
    writers: wallets.slice(1).map((a) => a.address),
    transactions: [],
  };
  const transactions = evidence.transactions as unknown[];
  await mkdir(".local", { recursive: true });
  let saving = Promise.resolve();
  const save = () => {
    const json = canonical(evidence);
    saving = saving.then(() => writeFile(".local/live-evidence.json", json));
    return saving;
  };
  transactions.push({ type: "lobby", ...lobby });
  evidence.lobbyKey = lobby.entityKey;
  await save();
  const lobbyTrust = {
    worldId,
    host: wallets[0].address,
    manifestKey: "",
    lobbyKey: lobby.entityKey,
  };
  await retry(() => loadLobbySession(client, lobbyTrust));
  for (let i = 1; i < 4; i++) {
    const result = await registerParticipant(
      writers[i],
      client,
      lobbyTrust,
      wallets[i].address,
      i === 3 ? "BREAKER" : "BUILDER",
    );
    transactions.push({
      type: "self-owned registration",
      writer: wallets[i].address,
      ...result,
    });
    await save();
    console.log(`Registration ${i}: ${result.entityKey}`);
  }
  await retry(async () => {
    const session = await loadLobbySession(client, lobbyTrust);
    if (session.roster.length !== 3)
      throw new Error("Waiting for all three indexed registrations");
    return session;
  });
  const created = await startRound(
    writers[0],
    client,
    lobbyTrust,
    wallets[0].address,
  );
  transactions.push({ type: "manifest", ...created });
  evidence.manifestKey = created.entityKey;
  await save();
  const trust = { ...lobbyTrust, manifestKey: created.entityKey };
  await writeFile(
    ".local/session.public.env",
    `VITE_RIFTRUN_WORLD_ID=${worldId}\nVITE_RIFTRUN_LOBBY_ENTITY_KEY=${lobby.entityKey}\nVITE_RIFTRUN_MANIFEST_ENTITY_KEY=${created.entityKey}\nVITE_RIFTRUN_HOST_ADDRESS=${wallets[0].address}\n`,
  );
  console.log(
    "Manifest confirmed. Public session identifiers saved to .local/session.public.env. Waiting for round start...",
  );
  const startBlock = (await retry(() => loadWorld(client, trust))).manifest
    .config.startBlock;
  while ((await client.getBlockTiming()).currentBlock < startBlock)
    await new Promise((resolve) => setTimeout(resolve, 1200));
  const initial = await retry(() => loadWorld(client, trust));
  const results = await Promise.all(
    writers.slice(1).map(async (writer, i) => {
      const result = await publishOperation(
        writer,
        client,
        initial,
        wallets[i + 1].address,
        i === 2 ? "center-wall" : "north-rift",
      );
      transactions.push({
        type: "operation",
        writer: wallets[i + 1].address,
        ...result,
      });
      await save();
      return result;
    }),
  );
  const beforeExpiry = await retry(async () => {
    const snapshot = await loadWorld(client, trust);
    if (
      results.some(
        (r) =>
          !snapshot.operations.some(
            (op) => op.key === r.entityKey.toLowerCase(),
          ),
      )
    )
      throw new Error("Waiting for indexed reads of actual written entities");
    if (snapshot.state.cells.length < 2)
      throw new Error(
        "Written operations did not pass protocol validation; inspect phase boundaries",
      );
    return snapshot;
  });
  evidence.beforeExpiry = {
    block: beforeExpiry.state.block,
    state: beforeExpiry.state,
    operations: beforeExpiry.operations,
  };
  evidence.query = runnableQuery(worldId, roundId);
  await save();
  const lastExpiry = results
    .map((r) => r.expiresAt)
    .reduce((a, b) => (a > b ? a : b));
  while ((await client.getBlockTiming()).currentBlock < lastExpiry)
    await new Promise((resolve) => setTimeout(resolve, 1200));
  const afterExpiry = await retry(() => loadWorld(client, trust));
  if (
    results.some((r) =>
      afterExpiry.operations.some((op) => op.key === r.entityKey.toLowerCase()),
    )
  )
    throw new Error("Native expiry not yet verified by query");
  evidence.afterExpiry = {
    block: afterExpiry.state.block,
    state: afterExpiry.state,
  };
  evidence.status =
    "CONFIRMED ON ARKIV — script proof; browser cross-client proof still required";
  await save();
  console.log(
    `LIVE SCRIPT PROOF PASSED. Before block ${beforeExpiry.state.block}; after block ${afterExpiry.state.block}.`,
  );
  console.log(
    "Evidence: .local/live-evidence.json. Start a new live round for browser gameplay; this short proof round may already be near its end.",
  );
} catch (error) {
  fail(error);
}
