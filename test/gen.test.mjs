// The generated files match their sources, and the committed census carries no HeroUI Pro value
// (Pro's licence forbids publishing its source: a Pro row keeps its key, the kind of its value and a
// variable NAME — never a literal, a fallback or the multiplier N).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("gen --check: shape/*.css is what src/ generates", () => {
  const r = spawnSync(process.execPath, ["scripts/gen.mjs", "--check"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("census.generated.json: Pro rows carry only 0, inherit or var(--name); no row has n", () => {
  const census = JSON.parse(fs.readFileSync(path.join(ROOT, "src/census.generated.json"), "utf8"));
  const pro = census.rows.filter((r) => r.pkg === "@heroui-pro/react");
  assert.ok(pro.length > 0);
  for (const r of pro) {
    if ("value" in r) {
      assert.match(r.value, /^(0|inherit|var\(--[a-z0-9-]+\))$/, `${r.component} ${r.selector} ${r.prop}: ${r.value}`);
      assert.doesNotMatch(r.value, /,/);
    }
  }
  for (const r of census.rows) assert.ok(!("n" in r), `${r.pkg} ${r.selector}: carries n`);
});
