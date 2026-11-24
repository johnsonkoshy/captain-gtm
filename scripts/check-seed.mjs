// Fails if any domain or email in seed/ is not on a .example domain.
import { readFileSync, readdirSync } from "node:fs";
const bad = [];
for (const f of readdirSync("seed")) {
  const src = readFileSync(`seed/${f}`, "utf8");
  for (const m of src.matchAll(/[\w.-]+@([\w-]+(?:\.[\w-]+)+)/g)) if (!m[1].endsWith(".example")) bad.push(`${f}: ${m[0]}`);
  for (const m of src.matchAll(/\b([a-z0-9-]+\.(?:com|io|ai|co|net|org|dev|app))\b/gi)) bad.push(`${f}: ${m[1]}`);
}
if (bad.length) { console.error("Non-.example domains in seed/:\n" + bad.join("\n")); process.exit(1); }
console.log("seed/ ok: .example domains only");
