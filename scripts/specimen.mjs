#!/usr/bin/env node
// specimen — render every censused HeroUI radius row, with the package applied, in real engines and
// check what each engine computes against what src/roles.mjs decided.
//
//   node scripts/specimen.mjs --from <product app dir> [--engine chromium|webkit|firefox|all]
//                             [--playwright <dir with @playwright/test>]
//
// The product supplies HeroUI, HeroUI Pro and Tailwind (its own versions, compiled with its own
// Tailwind); Playwright comes from the product, or from --playwright / ORUMIO_SPECIMEN_PLAYWRIGHT when
// the product has none. Everything is written to specimen-out/ — it holds HeroUI Pro's compiled CSS,
// which is licensed: specimen-out/ is gitignored and nothing from it may be copied into a tracked file.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { planRow, relaxState, specificity, splitPseudoElement, splitTop } from "./specimen/selector.mjs";
import { runtime } from "./specimen/runtime.mjs";
import { kSheetHtml, overlaySourceHtml, overlayCompositeHtml } from "./specimen/ksheet.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const R = await import(pathToFileURL(path.join(repo, "src/roles.mjs")).href);
const { decide } = await import(pathToFileURL(path.join(repo, "scripts/gen.mjs")).href);
const census = JSON.parse(fs.readFileSync(path.join(repo, "src/census.generated.json"), "utf8"));

// ── Arguments ─────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (name) => {
  const k = args.indexOf(`--${name}`);
  return k >= 0 ? args[k + 1] : undefined;
};
const from = opt("from");
if (!from) {
  console.error("usage: node scripts/specimen.mjs --from <product app dir> [--engine chromium|webkit|firefox|all]");
  process.exit(2);
}
const productDir = path.resolve(from);
const engineArg = opt("engine") ?? "all";
const ENGINES = engineArg === "all" ? ["chromium", "webkit", "firefox"] : [engineArg];
for (const e of ENGINES)
  if (!["chromium", "webkit", "firefox"].includes(e)) {
    console.error(`unknown engine ${e}`);
    process.exit(2);
  }

/** A short name for the product: its directory under the workspace (trade-counter, shared-inventory). */
function slugOf(dir) {
  const rel = path.relative(path.dirname(repo), dir);
  if (!rel.startsWith("..") && rel) return rel.split(path.sep)[0];
  return path.basename(dir);
}
const slug = slugOf(productDir);
const outRoot = path.join(repo, "specimen-out");
const outDir = path.join(outRoot, slug);
fs.mkdirSync(outDir, { recursive: true });

// ── Product resolution ────────────────────────────────────────────────────────────────────────────
const productRequire = createRequire(path.join(productDir, "package.json"));
function versionOf(pkg) {
  try {
    return JSON.parse(fs.readFileSync(productRequire.resolve(`${pkg}/package.json`), "utf8")).version;
  } catch {
    return null;
  }
}
const versions = { "@heroui/styles": versionOf("@heroui/styles"), "@heroui-pro/react": versionOf("@heroui-pro/react") };
if (!versions["@heroui/styles"]) {
  console.error(`${productDir}: @heroui/styles is not installed`);
  process.exit(2);
}

async function loadTailwind() {
  let entry = null;
  for (const n of ["@tailwindcss/postcss", "@tailwindcss/vite"]) {
    try {
      entry = productRequire.resolve(n);
      break;
    } catch {}
  }
  if (!entry) throw new Error(`${productDir}: neither @tailwindcss/postcss nor @tailwindcss/vite resolves`);
  const nodeEntry = createRequire(entry).resolve("@tailwindcss/node");
  const mjs = nodeEntry.replace(/index\.js$/, "index.mjs");
  return import(pathToFileURL(fs.existsSync(mjs) ? mjs : nodeEntry).href);
}

function loadPlaywright() {
  const dirs = [productDir, opt("playwright"), process.env.ORUMIO_SPECIMEN_PLAYWRIGHT, path.join(path.dirname(repo), "trade-counter/works/apps/web")].filter(Boolean);
  for (const d of dirs) {
    try {
      const req = createRequire(path.join(path.resolve(d), "package.json"));
      const t = req.resolve("@playwright/test");
      const core = createRequire(t)("playwright-core");
      return { pw: core, from: path.resolve(d), version: createRequire(t)("playwright-core/package.json").version };
    } catch {}
  }
  throw new Error(`no @playwright/test found in ${dirs.join(", ")} — pass --playwright <dir>`);
}

// ── 1. Compile ────────────────────────────────────────────────────────────────────────────────────
const UTILITIES = ["rounded-card", "rounded-control", "rounded-nested", "rounded-inset", "rounded-sheet", "rounded-circle", "rounded-full", "md:rounded-full"];
const ENTRY = `@import "@heroui/styles/css";\n@import "@heroui-pro/react/css";\n@import "@orumio/design/shape/app.css";\n`;
const tw = await loadTailwind();
const compiled = await tw.compile(ENTRY, {
  base: productDir,
  onDependency() {},
  customCssResolver: async (id) => (id.startsWith("@orumio/design/") ? path.join(repo, id.slice("@orumio/design/".length)) : undefined),
});
const css = compiled.build(UTILITIES);
fs.writeFileSync(path.join(outDir, "app.css"), css);

// ── 2–3. Rows, plans and expectations ────────────────────────────────────────────────────────────
const rem = (v) => parseFloat(v) * 16;
const stepPx = (s) => rem(R.STEPS[s]);
const rolePx = (r) => stepPx(R.ROLES[r]);
const CONTROLISH = new Set(["control", "inset", "xs", "sm", "md", "lg", "xl"]);

function expectFor(row, decision) {
  if (R.ROLES[decision]) return { kind: "px", px: rolePx(decision) };
  if (R.STEPS[decision]) return { kind: "px", px: stepPx(decision) };
  if (decision === R.CIRCLE) return { kind: "px", px: 9999, circle: true };
  if (decision === "inherit") return { kind: "inherit" };
  if (decision === "keep") {
    const v = (row.value ?? "").trim();
    if (/^0(px|rem)?$/.test(v)) return { kind: "px", px: 0 };
    let m = v.match(/^var\(--radius-([a-z0-9]+)\)$/);
    if (m && R.STEPS[m[1]]) return { kind: "px", px: stepPx(m[1]) };
    if (m && R.ROLES[m[1]]) return { kind: "px", px: rolePx(m[1]) };
    if (/^var\(--field-radius\b/.test(v)) return { kind: "px", px: rolePx("control") };
    m = v.match(/^min\((\d+(?:\.\d+)?)px,\s*var\(--radius-([a-z0-9]+)\)\)$/);
    if (m && R.STEPS[m[2]]) return { kind: "px", px: stepPx(m[2]), cap: +m[1] };
    if (/^var\(--[a-z0-9-]+\)$/.test(v)) return { kind: "unknown", why: `component variable ${v}` };
    return { kind: "unknown", why: `unrecognised keep value ${v || "(none)"}` };
  }
  throw new Error(`no expectation for ${decision}`);
}

const PROP_CORNERS = {
  "border-radius": ["tl", "tr", "br", "bl"],
  "border-top-left-radius": ["tl"],
  "border-top-right-radius": ["tr"],
  "border-bottom-right-radius": ["br"],
  "border-bottom-left-radius": ["bl"],
  "border-start-start-radius": ["tl"],
  "border-start-end-radius": ["tr"],
  "border-end-start-radius": ["bl"],
  "border-end-end-radius": ["br"],
};

const applicable = (row) => row.versions.includes(versions[row.pkg]);
const rows = [];
const notApplicable = [];
const skipped = [];
census.rows.forEach((row, i) => {
  if (!versions[row.pkg] || !applicable(row)) return notApplicable.push(i);
  const decision = decide(row);
  if (decision === "skip") return skipped.push(i);
  const corners = row.prop.startsWith("--") ? [row.prop] : PROP_CORNERS[row.prop];
  if (!corners) throw new Error(`unknown property ${row.prop}`);
  const alts = splitTop(row.selector).map((alt) => {
    const { host, pe } = splitPseudoElement(alt);
    return { host, pe, spec: specificity(host.replace(/::?(before|after)$/, "")).map((x, k) => (k === 2 && pe ? x + 1 : x)) };
  });
  // A row whose value is a component variable (`border-radius: var(--agenda-event-radius)`) is built
  // inside the element that defines the variable, and expects what that definition was decided to be.
  let planSelector = row.selector;
  let expect = expectFor(row, decision);
  let shapeDecision = decision;
  let via = null;
  const cv = row.kind === "component-var" && (row.value ?? "").match(/^var\((--[a-z0-9-]+)\)$/);
  if (cv) {
    const di = census.rows.findIndex((d) => d.prop === cv[1] && applicable(d));
    if (di >= 0) {
      const d = census.rows[di];
      via = { i: di, selector: d.selector, prop: d.prop };
      planSelector = splitTop(row.selector).map((alt) => `${d.selector} ${alt}`).join(", ");
      const dd = decide(d);
      if (dd !== "skip") {
        expect = expectFor(d, dd);
        shapeDecision = dd;
      } else expect = { kind: "unknown", why: `${cv[1]} is defined by a skip row (${d.selector})` };
    }
  }
  const { candidates, errors } = planRow(planSelector);
  rows.push({
    i,
    component: row.component,
    selector: row.selector,
    prop: row.prop,
    decision,
    shapeDecision,
    via,
    expect,
    corners,
    alts,
    size: CONTROLISH.has(decision) ? [200, 40] : [200, 120],
    candidates: candidates.map((c) => ({ ...c, relaxed: relaxState(c.host) })),
    errors,
  });
});

const capped = R.HEIGHT_CAPPED.map(({ selector, height, role }) => ({
  selector,
  classes: selector === ".chip" ? ["chip"] : ["chip", selector.slice(1)],
  heightPx: rem(height),
  role,
  rolePx: rolePx(role),
}));

// The height-capped rules roles.css appends inside `@supports not (corner-shape: …)`: later than every
// census row, so on a non-supporting engine they win any census row of equal or lower specificity.
const cappedRules = R.HEIGHT_CAPPED.map(({ selector, height, role }, k) => ({
  i: census.rows.length + k,
  synthetic: `HEIGHT_CAPPED ${selector}`,
  selector,
  decision: role,
  shapeDecision: role,
  corners: ["tl", "tr", "br", "bl"],
  alts: [{ host: selector, pe: null, spec: specificity(selector) }],
  expect: { kind: "capped", px: Math.min(rolePx(role) * R.K, (R.K * rem(height)) / 2) },
}));
const SPEC = { K: R.K, rows, capped, cappedRules };
const rowsHtml = `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<title>specimen rows — ${slug}</title>
<link rel="stylesheet" href="app.css">
<style>
  .sx-row { display: block; position: relative; margin: 8px; padding: 12px; min-height: 40px; }
  #sx-probe { position: absolute; left: -9999px; top: 0; width: 10px; height: 10px; }
</style>
</head>
<body>
<main id="sx-rows"></main>
<div id="sx-capped"></div>
<div id="sx-probe"></div>
<script>window.SPEC = ${JSON.stringify(SPEC)};</script>
<script>(${runtime.toString()})();</script>
</body>
</html>
`;
fs.writeFileSync(path.join(outDir, "rows.html"), rowsHtml);

// ── 4–5. Lanes ────────────────────────────────────────────────────────────────────────────────────
const { pw, from: pwFrom, version: pwVersion } = loadPlaywright();
// Pages are served from a synthetic http origin (routed to specimen-out/), not file://: a file:// page
// is its own opaque origin, so its style sheets' cssRules could not be read for diagnostics.
const ORIGIN = "http://specimen.test";
const fileUrl = (p) => `${ORIGIN}/${path.relative(outRoot, p).split(path.sep).map(encodeURIComponent).join("/")}`;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
async function serve(context) {
  await context.route(`${ORIGIN}/**`, async (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
    const file = path.join(outRoot, rel);
    if (!file.startsWith(outRoot) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "not found" });
    await route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] ?? "application/octet-stream", body: fs.readFileSync(file) });
  });
  return context;
}

async function runLane(engine) {
  const lane = { engine, playwright: `${pwVersion} (from ${pwFrom})`, status: "PASS", reasons: [] };
  let browser;
  try {
    browser = await pw[engine].launch();
  } catch (e) {
    lane.status = "FAIL";
    lane.reasons.push(`cannot launch ${engine}: ${e.message.split("\n")[0]}`);
    return lane;
  }
  lane.browserVersion = browser.version();
  try {
    const context = await serve(await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 }));
    const page = await context.newPage();
    await page.goto(fileUrl(path.join(outDir, "rows.html")));
    await page.waitForFunction(() => !!window.SX);
    const { env, rows: builtRows } = await page.evaluate(() => window.SX.buildAll());
    lane.env = env;
    lane.supports = env.supports;
    lane.fallbackTaken = env.rootScale === String(R.K) || parseFloat(env.rootScale) === R.K;
    if (engine === "chromium" && !env.supports) {
      lane.status = "FAIL";
      lane.reasons.push(`Chromium answered CSS.supports("corner-shape","superellipse(1.8)") = false — the primary engine is not being exercised`);
    }
    if (engine !== "chromium" && env.supports) {
      lane.status = "FAIL";
      lane.reasons.push(`${engine} ${lane.browserVersion} answered CSS.supports("corner-shape","superellipse(1.8)") = true — this lane tests the supported branch, not the fallback it exists to test`);
    }

    const results = [];
    const stateless = builtRows.filter((r) => r.built && !r.state.length).map((r) => r.i);
    const measured = await page.evaluate((ids) => ids.map((i) => window.SX.measure(i)), stateless);
    for (const r of builtRows.filter((r) => r.built && r.state.length)) {
      const row = rows.find((x) => x.i === r.i);
      const loc = page.locator(`[data-sx-row="${r.i}"] [data-sx-focus]`).first();
      if (r.state.includes("hover")) await page.locator(`[data-sx-row="${r.i}"] [data-sx-hover]`).first().hover({ force: true, timeout: 2000 }).catch(() => {});
      if (r.state.some((s) => s.startsWith("focus"))) {
        await page.keyboard.press("Shift");
        await loc.focus({ timeout: 2000 }).catch(() => {});
      }
      measured.push(await page.evaluate((i) => window.SX.measure(i), r.i));
      await page.evaluate(() => document.activeElement?.blur?.());
      await page.mouse.move(0, 0);
      void row;
    }
    const byI = new Map(measured.map((m) => [m.i, m]));
    for (const b of builtRows) {
      const row = rows.find((x) => x.i === b.i);
      const base = { i: b.i, component: row.component, selector: row.selector, prop: row.prop, decision: row.decision };
      if (!b.built) {
        results.push({ ...base, status: "unbuilt", reason: b.reason });
        continue;
      }
      const m = byI.get(b.i);
      if (!m.matches) {
        results.push({
          ...base,
          status: "unbuilt",
          reason: `built element does not match ${JSON.stringify(b.alt)}${b.state.length ? ` after applying ${b.state.join(", ")}` : ""}${m.matchErr ? ` (${m.matchErr})` : ""}`,
        });
        continue;
      }
      const ok = m.corners.every((c) => c.ok);
      const shadowed = [...new Set(m.corners.map((c) => c.shadowedBy).filter((x) => x !== null))];
      results.push({
        ...base,
        status: ok ? "pass" : "fail",
        alt: b.alt,
        state: b.state,
        shadowedBy: shadowed.map((j) =>
          census.rows[j]
            ? { i: j, selector: census.rows[j].selector, prop: census.rows[j].prop, decision: decide(census.rows[j]) }
            : { i: j, selector: cappedRules.find((c) => c.i === j).synthetic, prop: "border-radius", decision: cappedRules.find((c) => c.i === j).decision },
        ),
        corners: m.corners,
      });
    }
    // Diagnostics for failures: every rule that sets a radius or a corner shape on the element.
    const fails = results.filter((r) => r.status === "fail").slice(0, 80);
    for (const f of fails) {
      const row = rows.find((x) => x.i === f.i);
      if (row && builtRows.find((b) => b.i === f.i)?.state.length) continue;
      f.matchedRules = await page.evaluate((i) => window.SX.diagnose(i), f.i);
    }
    lane.rows = results;
    lane.capped = await page.evaluate(() => window.SX.capped());
    const count = (s) => results.filter((r) => r.status === s).length;
    lane.counts = {
      total: rows.length,
      built: results.filter((r) => r.status !== "unbuilt").length,
      pass: count("pass"),
      fail: count("fail"),
      unbuilt: count("unbuilt"),
      shadowed: results.filter((r) => r.shadowedBy?.length).length,
      cappedFail: lane.capped.filter((c) => !c.ok).length,
    };
    if (lane.counts.fail) {
      lane.status = "FAIL";
      lane.reasons.push(`${lane.counts.fail} built row(s) fail`);
    }
    if (lane.counts.cappedFail) {
      lane.status = "FAIL";
      lane.reasons.push(`${lane.counts.cappedFail} height-capped fallback(s) fail`);
    }

    // ── 6. The K sheet, and the overlay sources ──
    const ksheet = await serve(await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 }));
    const kp = await ksheet.newPage();
    fs.writeFileSync(path.join(outDir, "k-sheet.html"), kSheetHtml({ roles: R, engine, browserVersion: lane.browserVersion }));
    await kp.goto(fileUrl(path.join(outDir, "k-sheet.html")));
    await kp.waitForFunction(() => window.KSHEET_READY === true);
    lane.kSheet = await kp.evaluate(() => window.KSHEET);
    const sheetPath = path.join(outDir, `k-sheet-${engine}.png`);
    await kp.screenshot({ path: sheetPath, fullPage: true });
    fs.copyFileSync(sheetPath, path.join(outRoot, `k-sheet-${engine}.png`));
    lane.kSheetPng = [sheetPath, path.join(outRoot, `k-sheet-${engine}.png`)];
    fs.writeFileSync(path.join(outDir, "k-overlay-src.html"), overlaySourceHtml({ roles: R }));
    lane.overlay = {};
    for (const variant of engine === "chromium" ? ["shipped", "arcK", "arc1"] : ["shipped", "noK"]) {
      await kp.goto(`${fileUrl(path.join(outDir, "k-overlay-src.html"))}?v=${variant}`); // a query, not a hash: a hash change would not reload
      await kp.waitForFunction(() => window.OVERLAY_READY === true);
      const buf = await kp.screenshot({ clip: { x: 0, y: 0, width: 420, height: 520 } });
      lane.overlay[variant] = buf.toString("base64");
    }
    await ksheet.close();
    await context.close();
  } catch (e) {
    lane.status = "FAIL";
    lane.reasons.push(`lane crashed: ${e.stack}`);
  } finally {
    await browser.close();
  }
  return lane;
}

const lanes = [];
for (const engine of ENGINES) lanes.push(await runLane(engine));

// ── 6b. The overlay: Chromium's squircle (red) on the fallback engine's K-arc (blue) and unscaled arc
//        (grey), composited from real screenshots when a non-supporting engine ran.
let overlay = null;
const chromeLane = lanes.find((l) => l.engine === "chromium" && l.overlay);
if (chromeLane) {
  const arcLane = lanes.find((l) => l.engine !== "chromium" && l.overlay && l.supports === false);
  const method = arcLane
    ? `composited screenshots: Chromium ${chromeLane.browserVersion} (shipped, squircle) over ${arcLane.engine} ${arcLane.browserVersion} (shipped = K arc, and --shape-scale:1 = unscaled arc)`
    : `no non-supporting engine ran: the arcs are Chromium drawing corner-shape: round at r × ${R.K} and at r (same geometry a non-supporting engine draws)`;
  const layers = arcLane
    ? { red: chromeLane.overlay.shipped, blue: arcLane.overlay.shipped, grey: arcLane.overlay.noK }
    : { red: chromeLane.overlay.shipped, blue: chromeLane.overlay.arcK, grey: chromeLane.overlay.arc1 };
  const browser = await pw.chromium.launch();
  try {
    const page = await (await serve(await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 }))).newPage();
    fs.writeFileSync(path.join(outRoot, "k-overlay.html"), overlayCompositeHtml({ layers, method, roles: R }));
    await page.goto(fileUrl(path.join(outRoot, "k-overlay.html")));
    await page.waitForFunction(() => window.COMPOSITE_READY === true);
    await page.screenshot({ path: path.join(outRoot, "k-overlay.png"), fullPage: true });
    fs.copyFileSync(path.join(outRoot, "k-overlay.png"), path.join(outDir, "k-overlay.png"));
    overlay = { png: path.join(outRoot, "k-overlay.png"), method };
  } finally {
    await browser.close();
  }
}
for (const l of lanes) delete l.overlay;

// ── 7. Report ─────────────────────────────────────────────────────────────────────────────────────
const report = {
  product: slug,
  productDir,
  versions,
  generated: new Date().toISOString(),
  census: { rows: census.rows.length, notApplicable: notApplicable.length, skip: skipped.length, tested: rows.length },
  K: R.K,
  overlay,
  lanes,
};
const reportPath = path.join(outRoot, `report-${slug}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nspecimen — ${slug}  (@heroui/styles ${versions["@heroui/styles"]}, @heroui-pro/react ${versions["@heroui-pro/react"]})`);
console.log(`census ${census.rows.length} rows: ${rows.length} tested, ${skipped.length} skip, ${notApplicable.length} not in this version`);
console.log(`${pad("engine", 10)}${pad("version", 16)}${pad("supports", 10)}${pad("fallback", 10)}${pad("total", 7)}${pad("built", 7)}${pad("pass", 7)}${pad("fail", 7)}${pad("unbuilt", 9)}${pad("shadowed", 10)}${pad("capped", 8)}lane`);
for (const l of lanes) {
  const c = l.counts ?? {};
  console.log(
    `${pad(l.engine, 10)}${pad(l.browserVersion ?? "-", 16)}${pad(l.supports ?? "-", 10)}${pad(l.fallbackTaken ?? "-", 10)}${pad(c.total ?? "-", 7)}${pad(c.built ?? "-", 7)}${pad(c.pass ?? "-", 7)}${pad(c.fail ?? "-", 7)}${pad(c.unbuilt ?? "-", 9)}${pad(c.shadowed ?? "-", 10)}${pad(l.capped ? `${l.capped.length - c.cappedFail}/${l.capped.length}` : "-", 8)}${l.status}`,
  );
}
for (const l of lanes) {
  for (const r of l.reasons) console.log(`  ${l.engine}: ${r.split("\n")[0]}`);
  const fails = (l.rows ?? []).filter((r) => r.status === "fail");
  if (fails.length) {
    console.log(`  ${l.engine} — first ${Math.min(20, fails.length)} of ${fails.length} failures:`);
    for (const f of fails.slice(0, 20)) {
      const bad = f.corners.filter((c) => !c.ok);
      const desc = bad
        .map((c) => `${c.corner} exp ${c.expected === null ? "(any)" : `${+c.expected.toFixed(3)}px`}${c.expShape ? `/${c.expShape}` : ""} got ${c.actualRaw || c.actual}${c.expShape ? `/${c.shape}` : ""}${c.shadowedBy !== null ? ` [winner #${c.shadowedBy}]` : ""}`)
        .join("; ");
      console.log(`    #${f.i} ${f.selector.slice(0, 90)} {${f.prop}} ${desc}`);
    }
  }
  for (const c of (l.capped ?? []).filter((c) => !c.ok || !c.heightOk))
    console.log(`  ${l.engine} capped ${c.selector}: radius ${c.radius} expected ${+c.expected.toFixed(3)}; height ${c.measuredHeight} (declared ${c.declaredHeight})`);
}
const unbuilt = lanes.find((l) => l.rows)?.rows.filter((r) => r.status === "unbuilt") ?? [];
if (unbuilt.length) {
  console.log(`unbuilt (${unbuilt.length}):`);
  for (const u of unbuilt) console.log(`  #${u.i} ${u.selector} — ${u.reason}`);
}
if (overlay) console.log(`overlay: ${overlay.png}\n  method: ${overlay.method}`);
console.log(`report: ${reportPath}`);
const failed = lanes.some((l) => l.status !== "PASS");
process.exit(failed ? 1 : 0);
