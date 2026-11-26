/**
 * Runs an OpenNext Cloudflare command (build / preview / deploy) with the local
 * env file hidden, so local secrets are never bundled into the Worker.
 * Production values come from `wrangler secret` and .env.production.
 *   node scripts/cf.mjs build|preview|deploy
 */
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";

const LOCAL = ".env.development.local";
const HIDDEN = `${LOCAL}.cf-hidden`;
const cmd = process.argv[2];
if (!["build", "preview", "deploy"].includes(cmd)) throw new Error("usage: cf.mjs build|preview|deploy");

const run = (args) => {
  const r = spawnSync("npx", ["opennextjs-cloudflare", ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (existsSync(HIDDEN)) throw new Error(`${HIDDEN} exists: restore it to ${LOCAL} first`);
const hid = existsSync(LOCAL);
if (hid) renameSync(LOCAL, HIDDEN);
try {
  run(["build"]);
} finally {
  if (hid) renameSync(HIDDEN, LOCAL);
}
if (cmd !== "build") run([cmd]);
