import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const baseRef = process.env.VALIDATION_BASE_REF || "origin/meta_vista_frontend";

function captureGit(argumentsList) {
  const result = spawnSync("git", argumentsList, {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
  });
  return result.status === 0 ? result.stdout.split(/\r?\n/) : [];
}

function runLocalCli(relativePath, argumentsList) {
  const cli = resolve(repositoryRoot, relativePath);
  if (!existsSync(cli)) {
    throw new Error(`Missing ${relativePath}. Run npm ci first.`);
  }

  const result = spawnSync(process.execPath, [cli, ...argumentsList], {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${relativePath} failed with exit code ${result.status}`);
  }
}

const changedFiles = new Set([
  ...captureGit([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    `${baseRef}...HEAD`,
  ]),
  ...captureGit(["diff", "--name-only", "--diff-filter=ACMR"]),
  ...captureGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]),
  ...captureGit(["ls-files", "--others", "--exclude-standard"]),
]);
const existingFiles = [...changedFiles]
  .map((file) => file.replaceAll("\\", "/"))
  .filter(Boolean)
  .filter((file) => existsSync(resolve(repositoryRoot, file)))
  .sort();
const formatExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const lintExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const formatFiles = existingFiles.filter((file) =>
  formatExtensions.has(extname(file)),
);
const lintFiles = existingFiles.filter((file) =>
  lintExtensions.has(extname(file)),
);

if (formatFiles.length > 0) {
  runLocalCli("node_modules/prettier/bin/prettier.cjs", [
    "--check",
    ...formatFiles,
  ]);
}
if (lintFiles.length > 0) {
  runLocalCli("node_modules/eslint/bin/eslint.js", [
    "--cache",
    "--cache-location",
    "node_modules/.cache/eslint",
    "--no-warn-ignored",
    ...lintFiles,
  ]);
}
if (formatFiles.length === 0 && lintFiles.length === 0) {
  console.log("No changed files require formatting or lint checks.");
} else {
  console.log(
    `Checked ${formatFiles.length} formatted and ${lintFiles.length} linted file(s).`,
  );
}
