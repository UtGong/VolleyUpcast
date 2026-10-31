import { rm, mkdir, cp, writeFile, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const p of ["index.html", "src", "examples", "vendor", "models"])
  await cp(p, `dist/${p}`, { recursive: true });
const files = (await readdir("src"))
  .filter((p) => /\.(js|css)$/.test(p))
  .sort();
const hash = createHash("sha256");
for (const p of files) hash.update(await readFile("src/" + p));
const version = hash.digest("hex").slice(0, 12);
for (const p of files.filter((p) => p.endsWith(".js"))) {
  const text = await readFile("dist/src/" + p, "utf8");
  await writeFile(
    "dist/src/" + p,
    text.replace(/(from\s+["']\.\/[^"']+\.js)(["'])/g, `$1?v=${version}$2`),
  );
}
let html = await readFile("dist/index.html", "utf8");
html = html
  .replaceAll("./src/style.css", `./src/style.css?v=${version}`)
  .replaceAll("./src/app.js", `./src/app.js?v=${version}`)
  .replace('<html lang="en">', `<html lang="en" data-build="${version}">`);
await writeFile("dist/index.html", html);
await writeFile("dist/.nojekyll", "");
console.log(`Static build ${version} ready in dist/`);
