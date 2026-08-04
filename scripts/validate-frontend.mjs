import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const quick = process.argv.slice(2).includes("--quick");
const startedAt = Date.now();

function run(command, argumentsList) {
  console.log(`\n> ${command} ${argumentsList.join(" ")}`);
  const result = spawnSync(command, argumentsList, {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function localCli(relativePath) {
  const cli = resolve(repositoryRoot, relativePath);
  if (!existsSync(cli)) {
    throw new Error(`Missing ${relativePath}. Run npm ci first.`);
  }
  return cli;
}

run(process.execPath, ["--import", "tsx", "--test", "tests/**/*.test.ts"]);
run(process.execPath, [
  resolve(repositoryRoot, "scripts/check-db-type-sync.mjs"),
]);

if (quick) {
  run(process.execPath, [resolve(repositoryRoot, "scripts/check-changed.mjs")]);
} else {
  run(process.execPath, [localCli("node_modules/eslint/bin/eslint.js"), "."]);
  run(process.execPath, [
    localCli("node_modules/typescript/bin/tsc"),
    "-b",
    "--pretty",
    "false",
  ]);
  run(process.execPath, [localCli("node_modules/vite/bin/vite.js"), "build"]);
}

console.log(
  `\n${quick ? "Quick" : "Full"} frontend validation passed in ${Math.round(
    (Date.now() - startedAt) / 1000,
  )}s.`,
);
