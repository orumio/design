// orumio-shape-check against tiny fake products (test/fixtures/check/<case>/). Each case asserts the
// one check it is about, and that the detail names the right file and line.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runChecks, formatReport, exitCode } from "../src/check/index.mjs";
import { parseCss, importsOf, walk } from "../src/check/css.mjs";
import { heroImports, kebabComponent, componentOf, checkOutdated, deviationCommentProblem, radiusValueProblem } from "../src/check/rules.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "fixtures/check");
const BIN = path.join(HERE, "../bin/check.mjs");

function run(fixture, opts = {}) {
  return runChecks({ root: path.join(FIX, fixture), profile: "app", ...opts });
}
const rowOf = (res, id) => res.rows.find((r) => r.id === id);
/** The details of a row as "file:line" strings. */
const where = (row) => row.details.map((d) => `${d.file}:${d.line}`);

// ── passing products ────────────────────────────────────────────────────────────────────────────────
test("app-pass: every check passes (7 is skipped without --outdated)", () => {
  const res = run("app-pass");
  for (const r of res.rows) assert.equal(r.result, r.id === 7 ? "SKIP" : "PASS", `row ${r.id}: ${r.summary}`);
  assert.equal(res.ctx.rel(res.ctx.entry), "src/app.css");
  assert.equal(exitCode(res.rows), 0);
  assert.match(rowOf(res, 2).summary, /2 deviations/);
  assert.match(rowOf(res, 4).summary, /2 exempt lines/);
  assert.match(rowOf(res, 5).summary, /@heroui\/styles@3\.2\.5, @heroui-pro\/react@1\.0\.0-beta\.9/);
  assert.match(rowOf(res, 6).summary, /empty-state, sidebar/);
});

test("site-pass: every check passes, no HeroUI installed", () => {
  const res = run("site-pass", { profile: "site" });
  for (const r of res.rows) assert.equal(r.result, r.id === 7 ? "SKIP" : "PASS", `row ${r.id}: ${r.summary}`);
  assert.equal(res.ctx.rel(res.ctx.entry), "src/styles.css");
  assert.match(rowOf(res, 5).summary, /no HeroUI/);
});

// ── 1 ── the entry ──────────────────────────────────────────────────────────────────────────────────
test("1: the profile before the last HeroUI import fails", () => {
  const r = rowOf(run("entry-wrong-order"), 1);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/app.css:3"]);
  assert.match(r.details[0].message, /imported before @heroui-pro\/react\/css \(line 4\)/);
});

test("1: another import between HeroUI and the profile fails", () => {
  const r = rowOf(run("entry-not-adjacent"), 1);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/app.css:4"]);
  assert.match(r.details[0].message, /"\.\/brand\.css" \(line 3\) comes between/);
});

test("1: importing the profile twice fails", () => {
  const r = rowOf(run("entry-duplicate"), 1);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/app.css:5"]);
  assert.match(r.details[0].message, /again \(first at line 2\)/);
});

test("1: a module left out without a reason fails", () => {
  const r = rowOf(run("entry-omit-unjustified"), 1);
  assert.equal(r.result, "FAIL");
  // circles has no omit comment at all; curvature is imported (its empty omit comment is irrelevant)
  assert.deepEqual(where(r), ["src/app.css:2"]);
  assert.match(r.details[0].message, /omits circles\.css without saying why/);
});

test("1: modules left out with a reason (— or -) pass", () => {
  const r = rowOf(run("entry-omit-justified"), 1);
  assert.equal(r.result, "PASS", r.summary);
  assert.match(r.summary, /modules tokens, roles/);
});

test("1: a shape.deviations.css the entry does not import fails", () => {
  const res = run("entry-deviations-not-imported");
  const r = rowOf(res, 1);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/app.css:2"]);
  assert.match(r.details[0].message, /src\/shape\.deviations\.css exists but the entry does not import it/);
  assert.equal(rowOf(res, 2).result, "PASS"); // its form is fine
});

test("1: a module outside the profile fails (site importing roles.css)", () => {
  const r = rowOf(run("site-foreign-module", { profile: "site" }), 1);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/styles.css:3"]);
  assert.match(r.details[0].message, /not part of the site profile/);
});

test("1: two candidate entries ask for --entry; --entry resolves it", () => {
  const r = rowOf(run("entry-ambiguous"), 1);
  assert.equal(r.result, "FAIL");
  assert.match(r.summary, /2 CSS files imports @orumio\/design\/shape\/app\.css — pass --entry/);
  assert.deepEqual(where(r).slice(1), ["src/a.css:1", "src/b.css:1"]);
  const ok = rowOf(run("entry-ambiguous", { entry: path.join(FIX, "entry-ambiguous/src/a.css") }), 1);
  assert.equal(ok.result, "PASS", ok.summary);
});

// ── 2 ── shape.deviations.css ───────────────────────────────────────────────────────────────────────
test("2: --shape-scale is never a deviation", () => {
  const r = rowOf(run("dev-shape-scale"), 2);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/shape.deviations.css:3"]);
  assert.match(r.details[0].message, /--shape-scale is never a deviation/);
});

test("2: a selector other than :root fails", () => {
  const r = rowOf(run("dev-selector"), 2);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/shape.deviations.css:6"]);
  assert.match(r.details[0].message, /selector "\.card" — only :root/);
});

test("2: a declaration without its comment, a bad date and a malformed comment fail", () => {
  const r = rowOf(run("dev-missing-comment"), 2);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/shape.deviations.css:4", "src/shape.deviations.css:5", "src/shape.deviations.css:7"]);
  assert.match(r.details[0].message, /--shape-role-control has no \/\* deviation/);
  assert.match(r.details[1].message, /2026-13-01 is not a real date/);
  assert.match(r.details[2].message, /comment is not \/\* deviation/);
});

// ── 3 ── no shape in product CSS ────────────────────────────────────────────────────────────────────
test("3: corner-shape other than round in a CSS module fails", () => {
  const r = rowOf(run("css-corner-shape"), 3);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/components/Tile.module.css:3"]);
  assert.match(r.details[0].message, /corner-shape: superellipse\(2\)/);
});

test("3: defining --radius-* / --shape-* / --field-radius in product CSS fails, even in @theme", () => {
  const r = rowOf(run("css-radius-token"), 3);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/app.css:6", "src/app.css:9", "src/app.css:10"]);
  assert.match(r.details[0].message, /defines --radius-card/);
  assert.match(r.details[1].message, /defines --shape-role-card/);
  assert.match(r.details[2].message, /defines --field-radius/);
});

test("3: a literal radius, a calc radius and @apply rounded-[…] fail; var(--radius-*) passes", () => {
  const r = rowOf(run("css-literal-radius"), 3);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/app.css:5", "src/app.css:9", "src/app.css:12"]);
  assert.match(r.details[0].message, /border-radius: radius "12px"/);
  assert.match(r.details[1].message, /@apply rounded-\[5px\]/);
  assert.match(r.details[2].message, /calc\(var\(--radius-card\) - 4px\)/);
});

// ── 4 ── no ad-hoc radius in TSX ────────────────────────────────────────────────────────────────────
test("4: rounded-[…] without an exemption fails; an exemption needs a reason", () => {
  const r = rowOf(run("tsx-arbitrary"), 4);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/Badge.tsx:4", "src/Badge.tsx:7", "src/Badge.tsx:8"]);
  assert.match(r.details[0].message, /rounded-\[5px\]/);
  assert.match(r.details[1].message, /shape-exempt without a reason/);
  assert.match(r.details[2].message, /md:rounded-b-\[1px\]|rounded-b-\[1px\]/);
  assert.ok(!where(r).includes("src/Badge.tsx:6")); // exempted by the comment on line 5
});

test("4: borderRadius with a valid exemption passes (app-pass)", () => {
  const r = rowOf(run("app-pass"), 4);
  assert.equal(r.result, "PASS");
});

// ── 5 ── censused versions ──────────────────────────────────────────────────────────────────────────
test("5: an uncensused HeroUI version fails", () => {
  const r = rowOf(run("uncensused"), 5);
  assert.equal(r.result, "FAIL");
  assert.equal(r.details.length, 1);
  assert.equal(r.details[0].file, "node_modules/@heroui/styles/package.json");
  assert.match(r.details[0].message, /@heroui\/styles 3\.1\.0 is not censused — run the census in @orumio\/design first/);
});

test("5: the app profile without HeroUI installed fails", () => {
  const r = rowOf(run("entry-duplicate"), 5);
  assert.equal(r.result, "FAIL");
  assert.match(r.summary, /not installed/);
});

// ── 6 ── classified Pro components ──────────────────────────────────────────────────────────────────
test("6: importing an unclassified Pro component fails; import type is ignored", () => {
  const r = rowOf(run("pro-unclassified"), 6);
  assert.equal(r.result, "FAIL");
  assert.deepEqual(where(r), ["src/Board.tsx:3"]);
  assert.match(r.details[0].message, /Pro Kanban \(kanban\) is not classified in @orumio\/design/);
});

// ── 7 ── --outdated ─────────────────────────────────────────────────────────────────────────────────
test("7: never touches the network without --outdated; WARNs when older or offline", () => {
  let called = false;
  const skip = checkOutdated({ enabled: false, lsRemote: () => ((called = true), "") });
  assert.equal(skip.result, "SKIP");
  assert.equal(called, false);
  const tags = "abc\trefs/tags/v1.0.0\ndef\trefs/tags/v1.2.0\nfed\trefs/tags/v1.2.0^{}\n123\trefs/tags/v1.10.1\n456\trefs/tags/v2.0.0\n";
  assert.equal(checkOutdated({ enabled: true, version: "1.2.0", lsRemote: () => tags }).result, "WARN");
  assert.match(checkOutdated({ enabled: true, version: "1.2.0", lsRemote: () => tags }).summary, /older than v1\.10\.1/);
  assert.equal(checkOutdated({ enabled: true, version: "1.10.1", lsRemote: () => tags }).result, "PASS");
  const offline = checkOutdated({ enabled: true, version: "1.0.0", lsRemote: () => { throw Object.assign(new Error("x"), { stderr: "fatal: unable to access" }); } });
  assert.equal(offline.result, "WARN");
  assert.match(offline.summary, /unable to access/);
});

// ── the CLI ─────────────────────────────────────────────────────────────────────────────────────────
test("CLI: exit 0 on a passing product, 1 on a failing one, 2 on a usage error", () => {
  const ok = spawnSync(process.execPath, [BIN, "--profile", "app"], { cwd: path.join(FIX, "app-pass"), encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /^1  PASS /m);
  assert.match(ok.stdout, /all checks passed/);
  const bad = spawnSync(process.execPath, [BIN, "--profile", "app", "--root", path.join(FIX, "css-literal-radius")], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /^3  FAIL /m);
  assert.match(bad.stdout, /^  src\/app\.css:5: border-radius/m);
  assert.doesNotMatch(bad.stdout, /\x1b\[/); // not a TTY: no colour
  const usage = spawnSync(process.execPath, [BIN], { encoding: "utf8" });
  assert.equal(usage.status, 2);
});

test("formatReport: one line per check, then FAIL details", () => {
  const text = formatReport(run("css-corner-shape"));
  const rows = text.split("\n").filter((l) => /^\d+\s+(PASS|FAIL|WARN|SKIP)\s/.test(l));
  assert.equal(rows.length, 7);
  assert.match(text, /FAIL #3 .*\n  src\/components\/Tile\.module\.css:3: corner-shape/);
});

// ── units ───────────────────────────────────────────────────────────────────────────────────────────
test("parseCss: comments, strings, parentheses, nesting and line numbers", () => {
  const { root, comments } = parseCss(`@import "a;b.css" layer(x);
/* one
   two */
@theme {
  --radius-x: 1px; /* trailing */
  --url: url(data:a;b);
}
.a {
  &:hover { border-radius: 2px }
  content: "}{;";
  @media (width > 1px) { corner-shape: bevel; }
}
`);
  assert.deepEqual(importsOf(root).map((i) => [i.target, i.line]), [["a;b.css", 1]]);
  assert.deepEqual(comments.map((c) => [c.text.split("\n")[0], c.line, c.endLine]), [["one", 2, 3], ["trailing", 5, 5]]);
  const decls = [...walk(root)].filter((n) => n.type === "decl").map((d) => [d.prop, d.value, d.line]);
  assert.deepEqual(decls, [
    ["--radius-x", "1px", 5],
    ["--url", "url(data:a;b)", 6],
    ["border-radius", "2px", 9],
    ["content", '"}{;"', 10],
    ["corner-shape", "bevel", 11],
  ]);
});

test("heroImports / componentOf: named, subpath, aliased, type-only, multi-line", () => {
  const src = `import { A as B, type T, useSidebar } from "@heroui-pro/react";
import type { X } from "@heroui-pro/react";
import {
  KPIGroup,
} from '@heroui-pro/react';
import { Navbar } from "@heroui-pro/react/navbar";
import * as Pro from "@heroui-pro/react";
import { Button } from "@heroui/react";`;
  const got = heroImports(src).map((i) => [i.pkg, i.name, i.subpath, i.kind, i.line]);
  assert.deepEqual(got, [
    ["@heroui-pro/react", "A", null, "named", 1],
    ["@heroui-pro/react", "useSidebar", null, "named", 1],
    ["@heroui-pro/react", "KPIGroup", null, "named", 4],
    ["@heroui-pro/react", "Navbar", "navbar", "named", 6],
    ["@heroui-pro/react", null, null, "namespace", 7],
    ["@heroui/react", "Button", null, "named", 8],
  ]);
  assert.equal(kebabComponent("EmptyState"), "empty-state");
  assert.equal(kebabComponent("ItemCard"), "item-card");
  assert.equal(kebabComponent("KPIGroup"), "kpi-group");
  assert.equal(componentOf("useSidebar", null), "sidebar");
  assert.equal(componentOf("ChartTooltip", null), "chart-tooltip");
  assert.equal(componentOf("Root", "empty-state"), "empty-state");
});

test("deviation comments and radius values", () => {
  assert.equal(deviationCommentProblem("deviation: denser — masanori/2026-09-23"), null);
  assert.equal(deviationCommentProblem("deviation: a - b - c - masanori/2026-09-23"), null);
  assert.match(deviationCommentProblem("deviation: denser — masanori"), /is not/);
  assert.match(deviationCommentProblem("deviation: denser — masanori/2026-02-30"), /not a real date/);
  for (const ok of ["var(--radius-card)", "var(--radius-lg, 1rem)", "0", "0px", "inherit", "var(--radius-lg) var(--radius-lg) 0 0", "0 !important"]) {
    assert.equal(radiusValueProblem(ok), null, ok);
  }
  for (const bad of ["12px", "9999px", "var(--radius)", "var(--shape-role-card)", "calc(var(--radius-lg) - 2px)", "50%"]) {
    assert.notEqual(radiusValueProblem(bad), null, bad);
  }
});
