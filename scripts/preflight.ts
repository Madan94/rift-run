import { formatEther } from "viem";
import { accounts, fail, reader, secretNames } from "./env";
const missing = secretNames.filter((name) => !process.env[name]);
console.log(
  `Arkiv SDK: 1.0.1 | Rabdi chain ID: 7794095 | Node: ${process.version}`,
);
console.log(
  process.env.ARKIV_ACCESS_KEY
    ? "Access key: configured (value hidden)"
    : "Access key: absent; public RPC has strict rate limits",
);
if (missing.length) {
  console.error(
    `LIVE WRITE BLOCKED: ${missing.join(", ")}. Run npm run wallets:create, or configure your existing test wallets in ignored .env.`,
  );
  process.exitCode = 1;
}
try {
  const client = reader();
  const timing = await client.getBlockTiming();
  console.log(
    `READ-ONLY RPC OK: observed block ${timing.currentBlock}. This is not write/expiry evidence.`,
  );
  if (!missing.length) {
    const wallets = accounts();
    if (new Set(wallets.map((a) => a.address)).size !== 4)
      throw new Error(
        "Host and all three writers must have distinct addresses",
      );
    const balances = await Promise.all(
      wallets.map(async (a, i) => ({
        role: secretNames[i],
        address: a.address,
        tGLM: formatEther(await client.getBalance({ address: a.address })),
      })),
    );
    console.table(balances);
    if (balances.some((b) => Number(b.tGLM) === 0))
      throw new Error(
        "LIVE WRITE BLOCKED: fund every test wallet with tGLM before running the spike",
      );
  }
} catch (error) {
  fail(error);
}
