import { readFile, writeFile } from "node:fs/promises";
import { createOpenApiDocument } from "../src/openapi.js";

/**
 * Writes `openapi.json` from the API's route contracts. With `--check`, writes
 * nothing and exits 1 when the file differs from what the contracts give.
 */
const target = new URL("../openapi.json", import.meta.url);
const name = "packages/contracts/openapi.json";
const generated = `${JSON.stringify(await createOpenApiDocument(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(target, "utf8").catch(() => "");
  if (current !== generated) {
    console.error(
      `${name} is not up to date with the contracts. Run pnpm contracts:openapi and commit it.`,
    );
    process.exit(1);
  }
  console.log(`${name} is up to date.`);
} else {
  await writeFile(target, generated);
  console.log(`Wrote ${name}.`);
}
