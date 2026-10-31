import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
test("entry assets resolve under a project subpath and privacy CSP survives static hosting", async () => {
  const html = await readFile("index.html", "utf8");
  assert(html.includes('http-equiv="Content-Security-Policy"'));
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  const base = new URL("https://utgong.github.io/VolleyUpcast/");
  for (const ref of refs) {
    assert(ref.startsWith("./"));
    assert(new URL(ref, base).pathname.startsWith("/VolleyUpcast/"));
  }
  assert(html.includes("connect-src 'self'"));
});
test("build allowlist excludes local QA media, recordings and credentials", async () => {
  const builder = await readFile("scripts/build.mjs", "utf8");
  assert(builder.includes('["index.html", "src", "examples"]'));
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const path = dir + "/" + e.name;
      if (e.isDirectory()) await walk(path);
      else if (
        ![
          "examples/sample-video.webm",
          "examples/uvg-volleyball-match.mp4",
        ].includes(path)
      )
        assert(
          !/\.(webm|mp4|mov|wav|mp3|m4a|jpg|png)$|\.env/i.test(e.name),
          path,
        );
    }
  };
  await walk("examples");
});
