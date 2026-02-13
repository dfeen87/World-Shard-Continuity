import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultSchemaRegistry } from "../core/validator.js";
function usage() {
    console.error("Usage: npm run validate -- <schemaName> <pathToJson>");
    console.error("schemaName: player-identity | asset-ownership | world-shard");
    process.exit(2);
}
const [, , schemaNameRaw, jsonPathRaw] = process.argv;
if (!schemaNameRaw || !jsonPathRaw)
    usage();
const schemaName = schemaNameRaw;
const p = resolve(process.cwd(), jsonPathRaw);
const data = JSON.parse(readFileSync(p, "utf-8"));
const reg = defaultSchemaRegistry();
reg.validateOrThrow(schemaName, data);
console.log(`OK: ${schemaName} <- ${jsonPathRaw}`);
