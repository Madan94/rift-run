import { readFile, writeFile } from "node:fs/promises";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { fail, secretNames } from "./env";
try {
  let template = await readFile(".env.example", "utf8");
  const publicWallets = secretNames.map((name) => {
    const privateKey = generatePrivateKey();
    template = template.replace(`${name}=`, `${name}=${privateKey}`);
    return {
      role: name.replace("DEMO_", "").replace("_PRIVATE_KEY", ""),
      address: privateKeyToAccount(privateKey).address,
    };
  });
  await writeFile(".env", template, { flag: "wx", mode: 0o600 });
  console.log(
    "Created ignored .env with four NEW TEST-ONLY wallets. Existing .env files are never overwritten.",
  );
  console.table(publicWallets);
  console.log(
    "Add ARKIV_ACCESS_KEY locally and fund EACH public address at https://hub.arkiv.network/faucet. These addresses have not written any entities yet.",
  );
} catch (error) {
  fail(error);
}
