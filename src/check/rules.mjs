// The seven checks of orumio-shape-check (SHAPE.md §4). Each takes the run's context and returns
//   { id, result: "PASS" | "FAIL" | "WARN" | "SKIP", title, summary, details: [{ file, line, message }] }
// and never throws on a product's content: a check that cannot tell says so in its row.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { walk, importsOf } from "./css.mjs";
import { shapeModuleOf, knownParts, loadCensus, ownVersion } from "./context.mjs";
import { DEVIATIONS_FILE } from "./files.mjs";
import { STEPS, ROLES, CENSUSED, PRO_CLASSIFIED, PRO_EXPORT_COMPONENT } from "../roles.mjs";

const PRO = "@heroui-pro/react";
const OSS_STYLES = "@heroui/styles";
export const REPO_URL = "https://github.com/orumio/design.git";

function row(id, title, details, passSummary, { warn = false } = {}) {
  if (details.length === 0) return { id, result: "PASS", title, summary: passSummary, details };
  const first = details[0];
  const where = first.file ? `${first.file}${first.line ? `:${first.line}` : ""}: ` : "";
  const more = details.length > 1 ? ` (+${details.length - 1} more)` : "";
  return { id, result: warn ? "WARN" : "FAIL", title, summary: `${where}${first.message}${more}`, details };
}

const norm = (s) => s.replace(/\s+/g, " ").trim();

// ── 1 ── the entry imports the profile once, directly after HeroUI ─────────────────────────────────
const OMIT_RE = /^deviation:\s*omit\s+([a-z0-9-]+?)(?:\.css)?\s*(?:—|\s-\s)\s*(.*)$/;

export function checkEntry(ctx) {
  const P = ctx.profile;
  const title = `Entry imports ${P.file} once, directly after ${P.anchor.name}`;
  if (!ctx.entry) {
    const d = [{ file: "", line: 0, message: ctx.entryError.message }, ...ctx.entryError.details];
    return row(1, title, d);
  }
  const file = ctx.rel(ctx.entry);
  const { root, comments } = ctx.css(ctx.entry);
  const imps = importsOf(root);
  const details = [];
  const fail = (line, message) => details.push({ file, line, message });

  let anchorIdx = -1;
  imps.forEach((i, idx) => {
    if (P.anchor.after.test(i.target)) anchorIdx = idx;
  });
  if (anchorIdx === -1) {
    fail(1, `does not import ${P.anchor.name} (${P.anchor.discoverName}) — ${P.file} must come directly after it`);
    return row(1, title, details);
  }
  const anchor = imps[anchorIdx];

  const profileImps = [];
  const moduleImps = [];
  imps.forEach((i, idx) => {
    const m = shapeModuleOf(i.target);
    if (m === null) return;
    if (m === P.name) profileImps.push({ ...i, idx });
    else if (P.modules.includes(m)) moduleImps.push({ ...i, idx, module: m });
    else fail(i.line, `imports ${i.target}, which is not part of the ${P.name} profile (${P.modules.join(", ")})`);
  });

  if (profileImps.length === 0 && moduleImps.length === 0) {
    fail(anchor.line, `does not import ${P.target} — add it directly after this line`);
  }
  for (const dup of profileImps.slice(1)) fail(dup.line, `imports ${P.target} again (first at line ${profileImps[0].line}) — import it once`);
  if (profileImps.length && moduleImps.length) {
    for (const m of moduleImps) fail(m.line, `imports ${m.target}, which ${P.file} (line ${profileImps[0].line}) already imports`);
  }
  const seen = new Map();
  for (const m of moduleImps) {
    if (seen.has(m.module)) fail(m.line, `imports ${m.target} again (first at line ${seen.get(m.module)}) — import it once`);
    else seen.set(m.module, m.line);
  }

  // Position: the shape imports are the first @imports after the last anchor import, one block.
  const shapeImps = (profileImps.length ? profileImps.slice(0, 1) : [...new Map(moduleImps.map((m) => [m.module, m])).values()]).sort((a, b) => a.idx - b.idx);
  if (shapeImps.length) {
    const firstShape = shapeImps[0];
    if (firstShape.idx < anchorIdx) {
      fail(firstShape.line, `${firstShape.target} is imported before ${anchor.target} (line ${anchor.line}) — it must come directly after the last ${P.anchor.name} import`);
    } else if (firstShape.idx !== anchorIdx + 1) {
      const between = imps[anchorIdx + 1];
      fail(firstShape.line, `${firstShape.target} is not the first @import after ${anchor.target} (line ${anchor.line}): "${between.target}" (line ${between.line}) comes between`);
    } else {
      shapeImps.forEach((s, k) => {
        if (s.idx !== anchorIdx + 1 + k) {
          const between = imps[anchorIdx + 1 + k];
          fail(s.line, `${s.target} must follow the other shape modules directly: "${between.target}" (line ${between.line}) comes between`);
        }
      });
    }
    // Modules keep the profile's order (it is the cascade order).
    if (!profileImps.length) {
      const order = shapeImps.map((s) => s.module);
      const expected = P.modules.filter((m) => order.includes(m));
      if (order.join() !== expected.join()) fail(shapeImps[0].line, `modules are imported as ${order.join(", ")}; ${P.file} imports them as ${expected.join(", ")} — keep that order`);
    }
  }

  // Module omission: every module the entry leaves out is named, with a reason.
  if (!profileImps.length && moduleImps.length) {
    const omits = new Map();
    for (const c of comments) {
      const m = OMIT_RE.exec(norm(c.text));
      if (m) omits.set(m[1], { reason: m[2].trim(), line: c.line });
    }
    for (const m of P.modules.filter((x) => !seen.has(x))) {
      const o = omits.get(m);
      if (!o) fail(moduleImps[0].line, `omits ${m}.css without saying why — add /* deviation: omit ${m} — <reason> */`);
      else if (!o.reason) fail(o.line, `the omission of ${m}.css has no reason — /* deviation: omit ${m} — <reason> */`);
    }
  }

  // shape.deviations.css: imported by the entry, after the profile.
  const lastShapeIdx = Math.max(-1, ...profileImps.map((i) => i.idx), ...moduleImps.map((i) => i.idx));
  for (const dev of ctx.deviationFiles) {
    const imp = imps.map((i, idx) => ({ ...i, idx })).find((i) => /^\.{1,2}\//.test(i.target) && path.resolve(path.dirname(ctx.entry), i.target) === dev);
    if (!imp) {
      const r = path.relative(path.dirname(ctx.entry), dev).split(path.sep).join("/");
      fail(anchor.line, `${ctx.rel(dev)} exists but the entry does not import it — add @import "${r.startsWith(".") ? r : `./${r}`}"; after ${P.file}`);
    }
    else if (imp.idx < lastShapeIdx) fail(imp.line, `${imp.target} is imported before the profile — deviations must come after ${P.file}`);
  }

  const how = profileImps.length ? `${P.file} at line ${profileImps[0]?.line}` : `modules ${[...seen.keys()].join(", ")}`;
  const dev = ctx.deviationFiles.length ? `, then ${DEVIATIONS_FILE}` : "";
  return row(1, title, details, `${file}: ${how}, after ${anchor.target} (line ${anchor.line})${dev}`);
}

// ── 2 ── shape.deviations.css is `:root { --shape-*: … }`, each with its reason, who and date ──────
const DEVIATION_RE = /^deviation:\s*(.+)\s(?:—|-)\s*([^\s/][^/]*?)\s*\/\s*(\d{4}-\d{2}-\d{2})$/;

function validDate(s) {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Why a deviation comment is not well-formed, or null. */
export function deviationCommentProblem(text) {
  const m = DEVIATION_RE.exec(norm(text));
  if (!m) return "comment is not /* deviation: <reason> — <who>/<YYYY-MM-DD> */";
  if (!m[1].trim()) return "deviation comment has no reason";
  if (!validDate(m[3])) return `deviation comment date ${m[3]} is not a real date`;
  return null;
}

function tokenProblem(prop, parts) {
  if (!prop.startsWith("--")) return `${prop} is not a custom property — only --shape-* tokens may be set here`;
  if (prop === "--shape-scale") return "--shape-scale is never a deviation — only the fallback (curvature.css) sets it";
  if (prop === "--shape-base" || prop === "--shape-curvature") return null;
  let m;
  if ((m = /^--shape-step-(.+)$/.exec(prop))) return m[1] in STEPS ? null : `${prop}: no step "${m[1]}" (${Object.keys(STEPS).join(", ")})`;
  if ((m = /^--shape-role-(.+)$/.exec(prop))) return m[1] in ROLES ? null : `${prop}: no role "${m[1]}" (${Object.keys(ROLES).join(", ")})`;
  if ((m = /^--shape-part-(.+)$/.exec(prop))) return parts.has(m[1]) ? null : `${prop}: no part "${m[1]}" — roles.css reads no such --shape-part-*`;
  return `${prop} may not be set — only --shape-step-*, --shape-role-*, --shape-part-*, --shape-base, --shape-curvature`;
}

export function checkDeviations(ctx) {
  const title = `${DEVIATIONS_FILE} is :root --shape-* declarations, each dated`;
  if (!ctx.deviationFiles.length) return row(2, title, [], "no deviations");
  const parts = knownParts();
  const details = [];
  let count = 0;
  for (const f of ctx.deviationFiles) {
    const file = ctx.rel(f);
    const { root } = ctx.css(f);
    for (const node of root.children) {
      if (node.type === "comment") continue;
      if (node.type === "atrule") {
        details.push({ file, line: node.line, message: `@${node.name} is not allowed — only :root { --shape-*: … }` });
        continue;
      }
      if (node.type === "decl") {
        details.push({ file, line: node.line, message: `${node.prop} outside :root { … }` });
        continue;
      }
      if (node.selector.trim() !== ":root") {
        details.push({ file, line: node.line, message: `selector "${node.selector}" — only :root is allowed (a selector would beat HeroUI's own state rules)` });
        continue;
      }
      node.children.forEach((c, j) => {
        if (c.type === "comment") return;
        if (c.type !== "decl") {
          details.push({ file, line: c.line, message: `${c.type === "rule" ? `nested rule "${c.selector}"` : `@${c.name}`} inside :root — only declarations are allowed` });
          return;
        }
        count++;
        const p = tokenProblem(c.prop, parts);
        if (p) details.push({ file, line: c.line, message: p });
        const prev = node.children[j - 1];
        if (!prev || prev.type !== "comment") {
          details.push({ file, line: c.line, message: `${c.prop} has no /* deviation: <reason> — <who>/<YYYY-MM-DD> */ directly before it` });
        } else {
          const cp = deviationCommentProblem(prev.text);
          if (cp) details.push({ file, line: prev.line, message: `${cp} (before ${c.prop})` });
        }
      });
    }
  }
  return row(2, title, details, `${count} deviation${count === 1 ? "" : "s"} in ${ctx.deviationFiles.map(ctx.rel).join(", ")}`);
}

// ── 3 ── no shape outside the package ──────────────────────────────────────────────────────────────
const RADIUS_PROP = /^border(-[a-z]+)*-radius$/;
const CORNER_SHAPE_PROP = /^corner(-[a-z]+)*-shape$/;
const SHAPE_TOKEN = /^(--radius(-.*)?|--field-radius|--shape-.*)$/;
const ALLOWED_RADIUS = /^(var\(\s*--radius-[a-z0-9-]+\s*(,[\s\S]*)?\)|0|0px|inherit)$/i;
const APPLY_ARBITRARY = /(?:^|[\s:!])(rounded(?:-[a-z]{1,2})?-\[[^\]]*\]?)/;

/** Split a value on top-level spaces and slashes (not the ones inside var(…)). */
function valueParts(value) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && (/\s/.test(ch) || ch === "/")) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** Why a radius value is not allowed in product CSS, or null. */
export function radiusValueProblem(value) {
  const v = value.replace(/!important\s*$/i, "").trim();
  const parts = valueParts(v);
  if (parts.length && parts.every((p) => ALLOWED_RADIUS.test(p))) return null;
  return `radius "${v}" — use var(--radius-<role or step>) (or 0 / inherit); a literal or calc is a deviation of shape`;
}

export function checkNoShapeOutside(ctx) {
  const title = "No shape in product CSS outside the package";
  const details = [];
  const files = ctx.cssFiles.filter((f) => path.basename(f) !== DEVIATIONS_FILE);
  for (const f of files) {
    const file = ctx.rel(f);
    const { root } = ctx.css(f);
    for (const node of walk(root)) {
      if (node.type === "atrule" && node.name === "apply") {
        const m = APPLY_ARBITRARY.exec(node.params);
        if (m) details.push({ file, line: node.line, message: `@apply ${m[1]} — an arbitrary radius; use a role utility (rounded-control, rounded-card, …)` });
        continue;
      }
      if (node.type !== "decl") continue;
      const prop = node.prop.toLowerCase();
      if (prop.startsWith("--") ? SHAPE_TOKEN.test(node.prop) : false) {
        details.push({ file, line: node.line, message: `defines ${node.prop} — radius and shape tokens belong to @orumio/design (a product's differences go in ${DEVIATIONS_FILE})` });
        continue;
      }
      if (CORNER_SHAPE_PROP.test(prop)) {
        const v = node.value.replace(/!important\s*$/i, "").trim().toLowerCase();
        if (v !== "round") details.push({ file, line: node.line, message: `${prop}: ${node.value} — only "round" is allowed outside the package (the curvature is set once, by curvature.css)` });
        continue;
      }
      if (RADIUS_PROP.test(prop)) {
        const p = radiusValueProblem(node.value);
        if (p) details.push({ file, line: node.line, message: `${prop}: ${p}` });
      }
    }
  }
  return row(3, title, details, `${files.length} CSS file${files.length === 1 ? "" : "s"}: radii read var(--radius-*), no corner-shape, no token definitions`);
}

// ── 4 ── no ad-hoc radius in TSX/JSX ────────────────────────────────────────────────────────────────
const ARBITRARY_CLASS = /(?<![A-Za-z0-9_-])(rounded(?:-[a-z]{1,2})?-\[[^\]\s"'`]*\]?)/;
const INLINE_RADIUS = /(?:^|[^\w$])["']?(border(?:[A-Z][a-z]+){0,2}Radius)["']?\s*:(?!:)|\.(border(?:[A-Z][a-z]+){0,2}Radius)\s*=(?!=)/;
const EXEMPT = /(?:\/\/|\/\*)\s*shape-exempt:([^\n]*)/;
const COMMENT_LINE = /^(\/\/|\/?\*|\{\/\*.*\*\/\}$)/;

/** { exempt: true } | { exempt: false, empty: bool } for a line's own shape-exempt comment. */
function exemption(line) {
  const m = EXEMPT.exec(line);
  if (!m) return null;
  const reason = m[1].replace(/\*\/\s*\}?\s*$/, "").replace(/\*\/.*$/, "").trim();
  return { reason };
}

export function checkNoAdHocRadiusInScripts(ctx) {
  const title = "No rounded-[…] or inline borderRadius in TSX/JSX";
  const details = [];
  let exempted = 0;
  for (const f of ctx.scriptFiles) {
    const text = ctx.read(f);
    if (!/rounded(?:-[a-z]{1,2})?-\[|border(?:[A-Z][a-z]+){0,2}Radius/.test(text)) continue;
    const file = ctx.rel(f);
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (COMMENT_LINE.test(trimmed)) return;
      const cls = ARBITRARY_CLASS.exec(line);
      const inl = INLINE_RADIUS.exec(line);
      if (!cls && !inl) return;
      const what = cls ? `${cls[1]} — an arbitrary radius; use a role utility (rounded-control, rounded-card, …)` : `inline ${inl[1] ?? inl[2]} — radii come from the stylesheet`;
      const own = exemption(line);
      const above = i > 0 && COMMENT_LINE.test(lines[i - 1].trim()) ? exemption(lines[i - 1]) : null;
      const ex = own ?? above;
      if (ex && ex.reason) {
        exempted++;
        return;
      }
      if (ex) details.push({ file, line: own ? i + 1 : i, message: `shape-exempt without a reason — // shape-exempt: <reason>` });
      else details.push({ file, line: i + 1, message: `${what}, or mark the line // shape-exempt: <reason>` });
    });
  }
  const ex = exempted ? `, ${exempted} exempt line${exempted === 1 ? "" : "s"}` : "";
  return row(4, title, details, `${ctx.scriptFiles.length} source files${ex}`);
}

// ── 5 ── the installed HeroUI is censused ───────────────────────────────────────────────────────────
/** The package.json of `pkg` as the product resolves it, or null when it is not installed. */
export function installed(root, pkg) {
  const req = createRequire(path.join(root, "package.json"));
  let file = null;
  try {
    file = req.resolve(`${pkg}/package.json`);
  } catch {
    // Not exported (`exports` without ./package.json) or not installed: walk node_modules as Node does.
    for (let dir = root; ; dir = path.dirname(dir)) {
      const candidate = path.join(dir, "node_modules", pkg, "package.json");
      if (fs.existsSync(candidate)) {
        file = candidate;
        break;
      }
      if (path.dirname(dir) === dir) break;
    }
  }
  if (!file) return null;
  try {
    const { version } = JSON.parse(fs.readFileSync(file, "utf8"));
    return { version, file };
  } catch {
    return null;
  }
}

export function checkCensused(ctx) {
  const title = "Installed HeroUI versions are censused";
  const details = [];
  const found = [];
  for (const pkg of [OSS_STYLES, PRO]) {
    const got = installed(ctx.root, pkg);
    if (!got) continue;
    found.push(`${pkg}@${got.version}`);
    if (!(CENSUSED[pkg] ?? []).includes(got.version)) {
      details.push({ file: ctx.rel(got.file), line: 0, message: `${pkg} ${got.version} is not censused — run the census in @orumio/design first (SHAPE.md §HeroUI updates; censused: ${(CENSUSED[pkg] ?? []).join(", ") || "none"})` });
    }
  }
  if (!found.length) {
    if (ctx.profile.name === "app") details.push({ file: "", line: 0, message: `${OSS_STYLES} is not installed under ${ctx.root} — the app profile needs HeroUI (install dependencies first)` });
    return row(5, title, details, "no HeroUI installed (site)");
  }
  return row(5, title, details, found.join(", "));
}

// ── 6 ── every imported HeroUI Pro component is classified ─────────────────────────────────────────
const IMPORT_RE = /\b(import|export)\s+(type\s+)?(?:([\w$]+)\s*,\s*)?(\{[^}]*\}|\*(?:\s*as\s+[\w$]+)?|[\w$]+)\s*from\s*(["'])(@heroui(?:-pro)?\/react(?:\/[^"']*)?)\5/g;

/** `EmptyState` → `empty-state`, `useSidebar` → `sidebar`, `KPIGroup` → `kpi-group`. */
export function kebabComponent(exportName) {
  return exportName
    .replace(/^use(?=[A-Z])/, "")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export function componentOf(exportName, subpath) {
  return PRO_EXPORT_COMPONENT[exportName] ?? subpath ?? kebabComponent(exportName);
}

/** Every value import of a HeroUI React package in a source text: { pkg, subpath, name|null, kind, line }. */
export function heroImports(text) {
  const out = [];
  const lineAt = (idx) => text.slice(0, idx).split("\n").length;
  for (const m of text.matchAll(IMPORT_RE)) {
    if (m[2]) continue; // import type / export type
    const spec = m[6];
    const pkg = spec.startsWith(PRO) ? PRO : "@heroui/react";
    const subpath = spec.startsWith(`${pkg}/`) ? spec.slice(pkg.length + 1) : null;
    const clauseStart = m.index + m[0].indexOf(m[4]);
    if (m[3]) out.push({ pkg, subpath, name: null, kind: "default", line: lineAt(m.index) });
    if (m[4].startsWith("{")) {
      let offset = 1;
      for (const raw of m[4].slice(1, -1).split(",")) {
        const at = clauseStart + offset + (raw.length - raw.trimStart().length);
        offset += raw.length + 1;
        const s = raw.trim();
        if (!s || /^type\s/.test(s)) continue;
        out.push({ pkg, subpath, name: s.split(/\s+as\s+/)[0].trim(), kind: "named", line: lineAt(at) });
      }
    } else {
      out.push({ pkg, subpath, name: null, kind: m[4].startsWith("*") ? "namespace" : "default", line: lineAt(m.index) });
    }
  }
  return out;
}

export function checkProClassified(ctx) {
  const title = "Every imported HeroUI Pro component is classified";
  const census = loadCensus();
  const withRows = new Set(census.rows.filter((r) => r.pkg === PRO).map((r) => r.component));
  const details = [];
  const warnings = [];
  const components = new Set();
  let pro = 0;
  let oss = 0;
  for (const f of ctx.scriptFiles) {
    const text = ctx.read(f);
    if (!text.includes("@heroui")) continue;
    const file = ctx.rel(f);
    for (const imp of heroImports(text)) {
      if (imp.pkg !== PRO) {
        oss++;
        continue;
      }
      pro++;
      if (!imp.name) {
        warnings.push({ file, line: imp.line, message: `${imp.kind} import of ${PRO}${imp.subpath ? `/${imp.subpath}` : ""} — its components cannot be checked; import them by name` });
        continue;
      }
      const component = componentOf(imp.name, imp.subpath);
      components.add(component);
      if (withRows.has(component) && !PRO_CLASSIFIED.includes(component)) {
        details.push({ file, line: imp.line, message: `Pro ${imp.name} (${component}) is not classified in @orumio/design — add its rows to src/roles.mjs (PRO_CLASSIFIED, RULES)` });
      }
    }
  }
  const summary = `${pro} Pro import${pro === 1 ? "" : "s"} (${[...components].sort().join(", ") || "none"}), ${oss} @heroui/react import${oss === 1 ? "" : "s"} (OSS is classified by construction)`;
  if (details.length) return row(6, title, [...details, ...warnings]);
  if (warnings.length) return row(6, title, warnings, summary, { warn: true });
  return row(6, title, [], summary);
}

// ── 7 ── --outdated: a newer v1 tag exists ─────────────────────────────────────────────────────────
const cmpVersion = (a, b) => {
  const pa = a.split(/[.-]/).map(Number);
  const pb = b.split(/[.-]/).map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
};

export function defaultLsRemote() {
  return execFileSync("git", ["ls-remote", "--tags", REPO_URL], { encoding: "utf8", timeout: 20000, stdio: ["ignore", "pipe", "pipe"] });
}

export function checkOutdated({ enabled, lsRemote = defaultLsRemote, version = ownVersion() } = {}) {
  const title = "Package is the latest v1 release";
  if (!enabled) return { id: 7, result: "SKIP", title, summary: "not checked (pass --outdated; uses the network)", details: [] };
  let out;
  try {
    out = lsRemote();
  } catch (e) {
    const msg = String(e?.stderr || e?.message || e).split("\n").find((l) => l.trim()) ?? "unknown error";
    return { id: 7, result: "WARN", title, summary: `could not list ${REPO_URL} tags: ${msg.trim()}`, details: [] };
  }
  const tags = [...out.matchAll(/refs\/tags\/v(1\.\d+\.\d+)$/gm)].map((m) => m[1]);
  if (!tags.length) return { id: 7, result: "PASS", title, summary: `@orumio/design ${version}; no v1 tag published yet`, details: [] };
  const latest = tags.sort(cmpVersion).at(-1);
  if (cmpVersion(version, latest) < 0) {
    return { id: 7, result: "WARN", title, summary: `@orumio/design ${version} is older than v${latest} — update the dependency (SHAPE.md §Distribution)`, details: [] };
  }
  return { id: 7, result: "PASS", title, summary: `@orumio/design ${version} (latest v${latest})`, details: [] };
}

