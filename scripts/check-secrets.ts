import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
const env = parse(readFileSync(".env", "utf8"));
const secrets = Object.entries(env)
  .filter(
    ([name, value]) => /PRIVATE_KEY|ACCESS_KEY/.test(name) && value.length > 12,
  )
  .map(([, value]) => value);
const files = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACM"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const leaks = files.filter((file) =>
  secrets.some((secret) => readFileSync(file, "utf8").includes(secret)),
);
if (leaks.length) {
  console.error(
    `Secret found in staged file(s): ${leaks.join(", ")}. Values withheld.`,
  );
  process.exitCode = 1;
} else
  console.log(
    `Staged-source secret scan passed (${files.length} files; secret values never printed).`,
  );
