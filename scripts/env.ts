import { config } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { createReader, safeError } from "@riftrun/arkiv-adapter";
import type { Hex } from "viem";
config({ quiet: true });
export const secretNames = [
  "DEMO_HOST_PRIVATE_KEY",
  "DEMO_WRITER_A_PRIVATE_KEY",
  "DEMO_WRITER_B_PRIVATE_KEY",
  "DEMO_WRITER_C_PRIVATE_KEY",
] as const;
export function accounts() {
  return secretNames.map((name) => {
    const value = process.env[name];
    if (!value || !/^0x[0-9a-f]{64}$/i.test(value))
      throw new Error(
        `BLOCKED: ${name} is missing or invalid in the local .env. Use test-only keys; never paste secrets into chat.`,
      );
    return privateKeyToAccount(value as Hex);
  });
}
export function reader() {
  return createReader(
    process.env.ARKIV_ACCESS_KEY ?? "",
    process.env.ARKIV_RPC_URL && process.env.ARKIV_ACCESS_KEY
      ? undefined
      : process.env.ARKIV_RPC_URL,
  );
}
export function fail(error: unknown) {
  console.error(safeError(error));
  process.exitCode = 1;
}
export async function retry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let error: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (caught) {
      error = caught;
      if (i < attempts - 1)
        await new Promise((resolve) => setTimeout(resolve, 600 + i * 200));
    }
  }
  throw error;
}
