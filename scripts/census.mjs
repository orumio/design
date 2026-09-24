#!/usr/bin/env node
// census — read, never write, the HeroUI installed in ONE product and list every declaration that sets a
// corner radius, keyed the way roles.css has to match it: (package, component, at-rule context, the
// complete selector, the longhand).
//
//   node scripts/census.mjs --from <product app dir> [--out census/]
//
// Why the product's own node_modules: this repository is public and HeroUI Pro's licence (§3) forbids
// publishing its source, so Pro is never installed here. The census resolves postcss, Tailwind and
// both HeroUI packages from the product, exactly as that product's build does.
//
// OSS (`@heroui/styles`) ships SOURCE with `@apply rounded-3xl`, which means nothing until Tailwind
// compiles it. Each component file is compiled on its own, over the OSS theme, utilities and variants,
// with a PROBE ladder declared in a non-inline `@theme` — the same move the products make — so an OSS
// row compiles to `var(--radius-3xl)` when it follows the ladder and to something else when it does not.
// Pro (`@heroui-pro/react`) ships compiled CSS, one file per component, parsed as it is.
//
// Output: census/<package>@<version>.local.json — gitignored, because the Pro rows carry Pro's values.
// Only row KEYS, value KINDS and variable NAMES reach the committed file (src/census.generated.json).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import postcss from "postcss";

const { values: args } = parseArgs({
  options: {
    from: { type: "string", multiple: true },
    out: { type: "string", default: "census" },
    write: { type: "string", default: "src/census.generated.json" },
  },
});
if (!args.from?.length) {
  console.error("usage: census.mjs --from <product app dir> [--from …] [--out census/] [--write src/census.generated.json]");
  process.exit(2);
}

// Tailwind is the PRODUCT's: its compiler (@tailwindcss/node) is reached through whichever integration
// the product uses (@tailwindcss/postcss for the Next.js apps, @tailwindcss/vite for shared-inventory),
// so the census compiles with the exact version that product builds with. postcss is ours (a
// devDependency) and only PARSES the compiled output.
async function loadTailwind(req, from) {
  for (const via of ["@tailwindcss/node", "@tailwindcss/postcss", "@tailwindcss/vite"]) {
    let entry;
    try {
      entry = req.resolve(via);
    } catch {
      continue;
    }
    const target = via === "@tailwindcss/node" ? entry : createRequire(entry).resolve("@tailwindcss/node");
    return import(pathToFileURL(target.replace(/index\.js$/, "index.mjs")).href);
  }
  throw new Error(`no Tailwind v4 integration resolvable from ${from}`);
}

export const PROBE_LADDER = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];

/** Split a selector list on its TOP-LEVEL commas only (not the ones inside :is(), :has(), …). */
export function splitTop(list) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Resolve a nesting path to one selector: `&` is the parent as `:is(…)` (a single compound parent is
 *  substituted as it is — identical specificity), and a child without `&` is a descendant. */
export function flatten(rulePath) {
  return rulePath.reduce((parent, child) => {
    if (parent === null) return child;
    const p = /,/.test(parent) ? `:is(${parent})` : parent;
    return splitTop(child)
      .map((c) => (c.includes("&") ? c.trim().replaceAll("&", p) : `${p} ${c.trim()}`))
      .join(", ");
  }, null);
}

/** Custom properties whose name ends in `-radius` but which no border-radius reads — named, each with
 *  its reason, so a component token (`--card-radius`) is never dropped by a pattern.
 *  `--avatar-group-cut-radius` (@heroui/styles 3.2.6): the radius of the radial-gradient MASK that cuts
 *  an overlapped avatar in a clipped group; the avatar's own corner is `.avatar`'s circle row. */
export const NOT_A_CORNER = new Set(["--avatar-group-cut-radius"]);

/** Walk a parsed stylesheet and return every declaration that SETS a radius. */
export function radiusRows(root, { pkg, component }) {
  const rows = [];
  root.walkDecls((d) => {
    const isRadiusProp = /(^|-)radius$/.test(d.prop) || /^border-.*-radius$/.test(d.prop);
    if (!isRadiusProp || NOT_A_CORNER.has(d.prop)) return;
    // The key is the COMPLETE selector: a nested rule (`.combo-box__input { &:focus-visible {…} }`) is
    // kept as its path of rule selectors, outermost first, so roles.css can re-emit the same nesting
    // and land on the same specificity; `selector` is that path flattened the way nesting resolves.
    const ctx = [];
    const rulePath = [];
    for (let p = d.parent; p && p.type !== "root"; p = p.parent) {
      if (p.type === "rule") rulePath.unshift(p.selector.replace(/\s+/g, " ").trim());
      else if (p.type === "atrule") ctx.unshift(`@${p.name}${p.params ? " " + p.params.replace(/\s+/g, " ").trim() : ""}`);
    }
    if (rulePath.length === 0) return; // a bare @property / @theme declaration, not a component row
    const selector = flatten(rulePath);
    rows.push({ pkg, component, ctx: ctx.join(" > "), path: rulePath, selector, prop: d.prop, value: d.value.trim() });
  });
  return rows;
}

/** What a value IS, in terms the classifier can act on. Never emitted to a committed file for Pro. */
export function valueKind(value) {
  const v = value.replace(/\s+/g, " ").trim();
  let m;
  if (v === "0" || v === "0px") return { kind: "zero" };
  if (v === "inherit") return { kind: "inherit" };
  if (/^(3\.40282e38px|999px|9999px|var\(--radius-full(,9999px)?\)|calc\(var\(--radius\) \* 9999\)|calc\(infinity \* 1px\)|50%)$/.test(v)) return { kind: "circle" };
  if ((m = v.match(/^var\(--radius-(xs|sm|md|lg|xl|2xl|3xl|4xl)(,[^)]*)?\)$/))) return { kind: "ladder", step: m[1] };
  if ((m = v.match(/^calc\(var\(--radius\) \* ([0-9.]+)\)$/))) return { kind: "base", n: Number(m[1]) };
  if (v === "var(--radius)") return { kind: "base", n: 1 };
  if (/^var\(--field-radius/.test(v) || v === "var(--radius-field)") return { kind: "field" };
  if ((m = v.match(/^min\(([0-9.]+px), var\(--radius-(\w+)\)\)$/))) return { kind: "ladder-capped", step: m[2], cap: m[1] };
  if (/^var\(--[a-z0-9-]+-radius\)$/.test(v)) return { kind: "component-var" };
  if (/^[0-9.]+(px|rem)$/.test(v)) return { kind: "literal" };
  return { kind: "other" };
}

async function compileOss({ pkgDir, tailwindNode }) {
  const dir = pkgDir("@heroui/styles");
  const compDir = path.join(dir, "dist/components");
  // HeroUI's own cascade order: components/index.css imports shared parts first, on purpose.
  const order = [...fs.readFileSync(path.join(compDir, "index.css"), "utf8").matchAll(/@import\s+"\.\/([a-z0-9-]+\.css)"/g)].map((m) => m[1]);
  const files = [...order, ...fs.readdirSync(compDir).filter((f) => f.endsWith(".css") && f !== "index.css" && !order.includes(f)).sort()];
  const probe = PROBE_LADDER.map((s, i) => `  --radius-${s}: ${i + 1}px;`).join("\n");
  const rows = [];
  for (const f of files) {
    const component = f.replace(/\.css$/, "");
    // dist/index.css, with its one components import narrowed to this file. Resolved from inside the
    // package so its own dependencies (tw-animate-css) resolve the way they do in the product build.
    const entry = [
      `@layer theme, base, components, utilities;`,
      `@import "tailwindcss" source(none);`,
      `@import "tw-animate-css";`,
      `@import "./base/base.css" layer(base);`,
      `@import "./components/${f}" layer(components);`,
      `@import "./themes/default/index.css" layer(theme);`,
      `@import "./utilities/index.css";`,
      `@import "./variants/index.css";`,
      `@theme {\n${probe}\n}`,
    ].join("\n");
    const compiler = await tailwindNode.compile(entry, { base: path.join(dir, "dist"), onDependency() {} });
    const css = compiler.build([]);
    const root = postcss.parse(css);
    // Only the component's own layer: the theme / base / utilities rows are the same in every compile.
    const own = postcss.root();
    root.walkAtRules("layer", (at) => {
      if (at.params === "components" && at.nodes) own.append(at.clone());
    });
    rows.push(...radiusRows(own, { pkg: "@heroui/styles", component }));
  }
  return rows;
}

function parsePro({ pkgDir }) {
  // The product imports dist/css/index.css, which wraps every component in ONE `@layer components`; the
  // per-component files are the same rules unlayered. Rows are read from index.css (so their context is
  // the one the product really gets) and attributed to the component file that carries the same rule.
  const dir = path.join(pkgDir("@heroui-pro/react"), "dist/css");
  const owner = new Map();
  for (const f of fs.readdirSync(path.join(dir, "components")).filter((x) => x.endsWith(".css") && x !== "index.css").sort()) {
    const component = f.replace(/\.css$/, "");
    const root = postcss.parse(fs.readFileSync(path.join(dir, "components", f), "utf8"));
    for (const r of radiusRows(root, { pkg: "", component })) owner.set(`${r.selector}|${r.prop}|${r.value}`, component);
  }
  const root = postcss.parse(fs.readFileSync(path.join(dir, "index.css"), "utf8"));
  const rows = radiusRows(root, { pkg: "@heroui-pro/react", component: null });
  for (const r of rows) r.component = owner.get(`${r.selector}|${r.prop}|${r.value}`) ?? "(unattributed)";
  return rows;
}

const key = (r) => `${r.pkg}|${r.ctx}|${r.path.join(" {} ")}|${r.prop}`;

async function censusOf(fromDir) {
  const from = path.resolve(fromDir);
  const req = createRequire(path.join(from, "package.json"));
  const pkgDir = (name) => path.dirname(req.resolve(`${name}/package.json`));
  const version = (name) => JSON.parse(fs.readFileSync(path.join(pkgDir(name), "package.json"), "utf8")).version;
  const tailwindNode = await loadTailwind(req, from);
  const out = [];
  for (const [name, rows] of [
    ["@heroui/styles", await compileOss({ pkgDir, tailwindNode })],
    ["@heroui-pro/react", parsePro({ pkgDir })],
  ]) {
    const v = version(name);
    const full = rows.map((r) => ({ ...r, ...valueKind(r.value) }));
    const file = path.join(args.out, `${name.replace("/", "+")}@${v}.local.json`);
    fs.mkdirSync(args.out, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ package: name, version: v, from, rows: full }, null, 1) + "\n");
    console.log(`${name}@${v}: ${rows.length} rows → ${file}`);
    out.push({ name, version: v, rows: full });
  }
  return out;
}

/** Merge censuses of several versions into one ordered list: the newest version's order, with a row
 *  that only an older version has inserted right after the row that preceded it there. */
function merge(lists) {
  const byVersion = [...lists].sort((a, b) => a.version.localeCompare(b.version, "en", { numeric: true }));
  const merged = [];
  const seen = new Map();
  for (const list of byVersion.reverse()) {
    let prev = null;
    for (const r of list.rows) {
      const k = key(r);
      if (seen.has(k)) {
        seen.get(k).versions.add(list.version);
      } else {
        const entry = { ...r, versions: new Set([list.version]) };
        const at = prev === null ? 0 : merged.indexOf(seen.get(prev)) + 1;
        merged.splice(at, 0, entry);
        seen.set(k, entry);
      }
      prev = k;
    }
  }
  return merged;
}

const { HEROUI_N_TO_STEP } = await import(pathToFileURL(path.resolve("src/roles.mjs")).href);
const all = [];
for (const f of args.from) all.push(...(await censusOf(f)));
const versions = {};
const rows = [];
for (const name of ["@heroui/styles", "@heroui-pro/react"]) {
  const lists = all.filter((l) => l.name === name);
  const uniq = [...new Map(lists.map((l) => [l.version, l])).values()];
  versions[name] = uniq.map((l) => l.version).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  for (const r of merge(uniq)) {
    // The committed form. OSS is MIT: its value is kept. Pro's licence forbids publishing its source, so
    // a Pro row keeps its KEY, the KIND of its value, and — for a `calc(var(--radius) * N)` row — the
    // step HeroUI's own ladder gives N (never N itself). Variables (ladder, field, component tokens) are
    // names, not values, and are kept.
    const pub = { pkg: r.pkg, component: r.component, ctx: r.ctx, path: r.path, selector: r.selector, prop: r.prop, kind: r.kind };
    if (r.step) pub.step = r.step;
    if (r.pkg === "@heroui/styles") pub.value = r.value;
    // A Pro variable is kept by NAME only: its fallback (`var(--radius-2xl,1rem)`) is Pro's value, and
    // is dead anyway — tokens.css always defines the ladder and the field token.
    else if (["zero", "inherit"].includes(r.kind)) pub.value = r.value;
    else if (["field", "ladder", "component-var"].includes(r.kind)) pub.value = r.value.replace(/^var\((--[a-z0-9-]+)\s*,.*\)$/, "var($1)");
    if (r.kind === "base") {
      const step = HEROUI_N_TO_STEP[r.n];
      if (!step) throw new Error(`no step for N=${r.n} (${r.selector}) — extend HEROUI_N_TO_STEP`);
      pub.autoStep = step;
    }
    pub.versions = [...r.versions].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    rows.push(pub);
  }
}
fs.mkdirSync(path.dirname(args.write), { recursive: true });
fs.writeFileSync(
  args.write,
  JSON.stringify({ generated: "by scripts/census.mjs — do not edit; re-run the census (SHAPE.md §HeroUI updates)", versions, rows }, null, 1) + "\n",
);
console.log(`${rows.length} rows → ${args.write}`, versions);
