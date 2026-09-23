// What every check reads: the product root, its profile, its entry stylesheet, its files, and this
// package's own profiles, parts and census. Built once per run; files are read and parsed once.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCss, importsOf } from "./css.mjs";
import { listFiles, isCss, isScript, DEVIATIONS_FILE } from "./files.mjs";

export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SHAPE_PREFIX = "@orumio/design/shape/";

/** Where each profile must sit: after the last import this matches (row 1), and how an entry is found
 *  when no CSS file imports the profile yet. */
const ANCHORS = {
  app: { name: "HeroUI", after: /^@heroui\/styles(\/|$)|^@heroui-pro\/react(\/|$)/, discover: /^@heroui\/styles(\/|$)/, discoverName: "@heroui/styles" },
  site: { name: "tailwindcss", after: /^tailwindcss(\/|$)/, discover: /^tailwindcss(\/|$)/, discoverName: "tailwindcss" },
};

/** A profile's modules, in its own order, read from shape/<profile>.css — the file is the definition. */
export function profileModules(profile) {
  const text = fs.readFileSync(path.join(PKG_ROOT, "shape", `${profile}.css`), "utf8");
  return importsOf(parseCss(text).root)
    .map((i) => /^\.\/([\w-]+)\.css$/.exec(i.target)?.[1])
    .filter(Boolean);
}

export function profileOf(name) {
  if (!ANCHORS[name]) throw new Error(`unknown profile "${name}" (app | site)`);
  return { name, file: `${name}.css`, target: `${SHAPE_PREFIX}${name}.css`, modules: profileModules(name), anchor: ANCHORS[name] };
}

/** Every `--shape-part-<name>` this package reads (roles.css, circles.css, tokens.css). */
export function knownParts() {
  const parts = new Set();
  for (const f of fs.readdirSync(path.join(PKG_ROOT, "shape")).filter((x) => x.endsWith(".css"))) {
    for (const m of fs.readFileSync(path.join(PKG_ROOT, "shape", f), "utf8").matchAll(/--shape-part-([a-z0-9-]+)/g)) parts.add(m[1]);
  }
  return parts;
}

export function loadCensus() {
  return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, "src/census.generated.json"), "utf8"));
}

export function ownVersion() {
  return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, "package.json"), "utf8")).version;
}

/** Name of the shape module an import target points at (`app`, `tokens`, …), or null. */
export function shapeModuleOf(target) {
  if (!target.startsWith(SHAPE_PREFIX)) return null;
  return target.slice(SHAPE_PREFIX.length).replace(/\.css$/, "");
}

export function createContext({ root, profile, entry }) {
  const absRoot = path.resolve(root);
  const P = profileOf(profile);
  const textCache = new Map();
  const cssCache = new Map();
  const read = (file) => {
    if (!textCache.has(file)) textCache.set(file, fs.readFileSync(file, "utf8"));
    return textCache.get(file);
  };
  const css = (file) => {
    if (!cssCache.has(file)) cssCache.set(file, parseCss(read(file)));
    return cssCache.get(file);
  };
  const rel = (file) => (file ? path.relative(absRoot, file).split(path.sep).join("/") || "." : "");
  const cssFiles = listFiles(absRoot, isCss);
  const scriptFiles = listFiles(absRoot, isScript);
  const deviationFiles = cssFiles.filter((f) => path.basename(f) === DEVIATIONS_FILE);
  const ctx = { root: absRoot, profile: P, read, css, rel, cssFiles, scriptFiles, deviationFiles, entry: null, entryError: null };

  if (entry) {
    const abs = path.resolve(entry);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) ctx.entry = abs;
    else ctx.entryError = { message: `--entry ${entry} does not exist`, details: [] };
  } else {
    discoverEntry(ctx);
  }
  return ctx;
}

/** The entry is the one CSS file that imports the profile (or one of its modules); failing that, the
 *  one that imports HeroUI's styles (app) or Tailwind (site). Zero or several → ask for --entry. */
function discoverEntry(ctx) {
  const P = ctx.profile;
  const candidates = ctx.cssFiles.filter((f) => path.basename(f) !== DEVIATIONS_FILE);
  const importing = (test) => candidates.filter((f) => importsOf(ctx.css(f).root).some((i) => test(i.target)));
  const tiers = [
    [importing((t) => { const m = shapeModuleOf(t); return m === P.name || P.modules.includes(m); }), `imports ${P.target}`],
    [importing((t) => P.anchor.discover.test(t)), `imports ${P.anchor.discoverName}`],
  ];
  for (const [found, what] of tiers) {
    if (found.length === 1) {
      ctx.entry = found[0];
      return;
    }
    if (found.length > 1) {
      ctx.entryError = {
        message: `${found.length} CSS files ${what} — pass --entry <file>`,
        details: found.map((f) => ({ file: ctx.rel(f), line: 1, message: `candidate entry (${what})` })),
      };
      return;
    }
  }
  ctx.entryError = { message: `no CSS file under the root imports ${P.target} or ${P.anchor.discoverName} — pass --entry <file>`, details: [] };
}
