// assets/<id>/<id>.glb is the source of truth. app/public/assets/models/<id>.glb is the runtime
// copy Vite serves. Run without arguments to refresh the runtime copies, or with --check to fail
// when they have drifted.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDir = join(root, "assets");
const targetDir = join(root, "app", "public", "assets", "models");
const checkOnly = process.argv.includes("--check");

const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const ids = readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const problems = [];
const copied = [];

for (const id of ids) {
  const source = join(sourceDir, id, `${id}.glb`);
  const target = join(targetDir, `${id}.glb`);
  if (!existsSync(source)) {
    problems.push(`assets/${id}/ has no ${id}.glb`);
    continue;
  }
  if (!existsSync(target)) {
    if (checkOnly) problems.push(`missing runtime copy: app/public/assets/models/${id}.glb`);
    else {
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(source, target);
      copied.push(id);
    }
    continue;
  }
  if (digest(source) === digest(target)) continue;
  if (checkOnly) problems.push(`out of date: app/public/assets/models/${id}.glb differs from assets/${id}/${id}.glb`);
  else {
    copyFileSync(source, target);
    copied.push(id);
  }
}

const known = new Set(ids.map((id) => `${id}.glb`));
const extra = existsSync(targetDir)
  ? readdirSync(targetDir).filter((name) => name.endsWith(".glb") && !known.has(name))
  : [];
for (const name of extra) {
  // Never deleted automatically: an unexpected runtime GLB may be someone else's work in progress.
  problems.push(`no authoring source for app/public/assets/models/${name}; remove it or add assets/${name.replace(/\.glb$/, "")}/`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`FAIL: ${problem}`);
  console.error(
    checkOnly
      ? `${problems.length} problem(s). Run \`npm run sync:models\` after re-exporting, then re-check.`
      : `${problems.length} problem(s) need a manual fix.`,
  );
  process.exit(1);
}

if (checkOnly) console.log(`PASS: ${ids.length} runtime GLB(s) match assets/.`);
else if (copied.length > 0) console.log(`Synced ${copied.length} GLB(s): ${copied.join(", ")}`);
else console.log(`Already in sync: ${ids.length} GLB(s).`);
