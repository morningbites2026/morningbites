import fs from "node:fs";
import path from "node:path";

const src = path.resolve("apps/morning-bites/dist/public");
const dest = path.resolve("public");

if (!fs.existsSync(src)) {
  console.error(`Missing build output at ${src}`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Prepared Vercel output at ${dest}`);
