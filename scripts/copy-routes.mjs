import { copyFile, mkdir } from "node:fs/promises";
// Explicit static entry files let /play and /crowd reload on hosts without SPA rewrites.
for (const route of ["play", "crowd"]) {
  await mkdir(new URL("../dist/" + route + "/", import.meta.url), {
    recursive: true,
  });
  await copyFile(
    new URL("../dist/index.html", import.meta.url),
    new URL("../dist/" + route + "/index.html", import.meta.url),
  );
}
