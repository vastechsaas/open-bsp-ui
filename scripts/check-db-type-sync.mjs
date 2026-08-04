import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argumentsList = process.argv.slice(2);
const apiFileIndex = argumentsList.indexOf("--api-file");
const configuredApiFile =
  (apiFileIndex >= 0 ? argumentsList[apiFileIndex + 1] : null) ||
  process.env.API_DB_TYPES_FILE ||
  "../open-bsp-api/supabase/functions/_shared/db_types.ts";
const apiFile = resolve(repositoryRoot, configuredApiFile);
const uiFile = resolve(repositoryRoot, "src/supabase/db_types.ts");
const requiredSchemas = ["billing", "public", "storage"];

if (apiFileIndex >= 0 && !argumentsList[apiFileIndex + 1]) {
  throw new Error("--api-file requires a backend db_types.ts path");
}
if (!existsSync(apiFile)) {
  throw new Error(
    `Backend database types were not found at ${apiFile}. Set API_DB_TYPES_FILE or pass --api-file.`,
  );
}

const normalize = (value) => value.replaceAll("\r\n", "\n");
const apiTypes = normalize(readFileSync(apiFile, "utf8"));
const uiTypes = normalize(readFileSync(uiFile, "utf8"));

for (const schema of requiredSchemas) {
  const schemaPattern = new RegExp(`^  ${schema}: \\{`, "m");
  if (!schemaPattern.test(apiTypes)) {
    throw new Error(`Backend database types are missing the ${schema} schema.`);
  }
  if (!schemaPattern.test(uiTypes)) {
    throw new Error(
      `Frontend database types are missing the ${schema} schema.`,
    );
  }
}

if (apiTypes !== uiTypes) {
  throw new Error(
    `Frontend database types are stale. Copy ${apiFile} to ${uiFile} after regenerating backend types.`,
  );
}

console.log(
  `Database types match the backend and include ${requiredSchemas.join(", ")}.`,
);
