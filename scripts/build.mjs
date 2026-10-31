import { rm, mkdir, cp } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const p of ["index.html", "src", "examples"])
  await cp(p, `dist/${p}`, { recursive: true });
console.log("Static build ready in dist/");
