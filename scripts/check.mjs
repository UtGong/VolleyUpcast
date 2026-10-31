import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
for (const dir of ["src", "scripts", "tests"])
  for (const name of readdirSync(dir).filter((n) => /\.m?js$/.test(n))) {
    const result = spawnSync(process.execPath, ["--check", `${dir}/${name}`], {
      stdio: "inherit",
    });
    if (result.status) process.exit(result.status);
  }
console.log("JavaScript syntax checks passed");
