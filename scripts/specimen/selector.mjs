// specimen/selector — a small CSS selector parser and a selector → DOM-plan builder, enough for every
// selector the census holds. The plan is a JSON tree the page turns into elements with DOM APIs (never
// innerHTML, so a `td` outside a table is not dropped by the HTML parser). The page, not this file,
// decides whether a plan matches: every candidate is checked with `el.matches()` there.

// ── Parsing ───────────────────────────────────────────────────────────────────────────────────────
/** Split on a delimiter at depth 0 (outside (), [] and strings). */
export function splitTop(s, delim = ",") {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      cur += ch;
      if (ch === "\\") cur += s[++i] ?? "";
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === delim && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const LEGACY_PE = new Set(["before", "after", "first-line", "first-letter"]);
const IDENT = /^-?(?:[_a-zA-Z0-9-]|\\.)+/;

/** Parse a complex (or relative, when `relative`) selector → [{ comb, c: compound }]. */
export function parseComplex(src, relative = false) {
  const s = src.trim();
  const steps = [];
  let i = 0;
  let comb = null;
  const ws = () => {
    let saw = false;
    while (i < s.length && /\s/.test(s[i])) (i++, (saw = true));
    return saw;
  };
  ws();
  if (relative && /[>+~]/.test(s[i])) {
    comb = s[i++];
    ws();
  } else if (relative) comb = " ";
  while (i < s.length) {
    const [compound, next] = parseCompound(s, i);
    if (!compound) throw new Error(`cannot parse compound at ${i} in ${s}`);
    steps.push({ comb, c: compound });
    i = next;
    const sawWs = ws();
    if (i >= s.length) break;
    if (/[>+~]/.test(s[i])) {
      comb = s[i++];
      ws();
    } else if (sawWs) comb = " ";
    else throw new Error(`unexpected ${s[i]} at ${i} in ${s}`);
  }
  if (!steps.length) throw new Error(`empty selector: ${src}`);
  return steps;
}

function readParens(s, i) {
  // s[i] === "(" → [inner, index after ")"]
  let depth = 0;
  let quote = null;
  for (let j = i; j < s.length; j++) {
    const ch = s[j];
    if (quote) {
      if (ch === "\\") j++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  throw new Error(`unbalanced ( in ${s}`);
}

function unescape(id) {
  return id.replace(/\\(.)/g, "$1");
}

export function parseCompound(s, i0) {
  const c = { tag: null, id: null, classes: [], attrs: [], pseudos: [], pe: null };
  let i = i0;
  let any = false;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "*") {
      c.tag = c.tag ?? "*";
      i++;
    } else if (/[a-zA-Z]/.test(ch) && !any) {
      const m = s.slice(i).match(IDENT);
      c.tag = m[0].toLowerCase();
      i += m[0].length;
    } else if (ch === "." || ch === "#") {
      const m = s.slice(i + 1).match(IDENT);
      if (!m) throw new Error(`bad ${ch} in ${s}`);
      if (ch === ".") c.classes.push(unescape(m[0]));
      else c.id = unescape(m[0]);
      i += 1 + m[0].length;
    } else if (ch === "[") {
      let j = i + 1;
      let quote = null;
      for (; j < s.length; j++) {
        if (quote) {
          if (s[j] === "\\") j++;
          else if (s[j] === quote) quote = null;
        } else if (s[j] === '"' || s[j] === "'") quote = s[j];
        else if (s[j] === "]") break;
      }
      const body = s.slice(i + 1, j).trim();
      const m = body.match(/^([\w:-]+)\s*(?:([~|^$*]?=)\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s\]]+)\s*([iIsS])?)?$/);
      if (!m) throw new Error(`bad attribute [${body}]`);
      let value = m[3];
      if (value && /^["']/.test(value)) value = value.slice(1, -1).replace(/\\(.)/g, "$1");
      c.attrs.push({ name: m[1], op: m[2] ?? null, value: value ?? null });
      i = j + 1;
    } else if (ch === ":") {
      const double = s[i + 1] === ":";
      const start = i + (double ? 2 : 1);
      const m = s.slice(start).match(IDENT);
      const name = m[0].toLowerCase();
      let j = start + m[0].length;
      let arg = null;
      if (s[j] === "(") [arg, j] = readParens(s, j);
      if (double || LEGACY_PE.has(name)) c.pe = name;
      else c.pseudos.push({ name, arg });
      i = j;
    } else break;
    any = true;
  }
  return any ? [c, i] : [null, i];
}

// ── Specificity ───────────────────────────────────────────────────────────────────────────────────
export function specificity(sel) {
  return parseComplex(sel).reduce((acc, { c }) => add(acc, compoundSpec(c)), [0, 0, 0]);
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function max(list) {
  return list.reduce((m, x) => (cmp(x, m) > 0 ? x : m), [0, 0, 0]);
}
export function cmp(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
function compoundSpec(c) {
  let sp = [c.id ? 1 : 0, c.classes.length + c.attrs.length, c.tag && c.tag !== "*" ? 1 : 0];
  if (c.pe) sp = add(sp, [0, 0, 1]);
  for (const p of c.pseudos) {
    if (p.name === "where") continue;
    if (["is", "not", "has", "matches"].includes(p.name))
      sp = add(sp, max(splitTop(p.arg).map((x) => relSpec(x, p.name === "has"))));
    else sp = add(sp, [0, 1, 0]);
  }
  return sp;
}
function relSpec(x, relative) {
  return parseComplex(x, relative).reduce((acc, { c }) => add(acc, compoundSpec(c)), [0, 0, 0]);
}

// ── Pseudo-element and state helpers ──────────────────────────────────────────────────────────────
/** → { host: the selector without its trailing pseudo-element, pe: "before" | "after" | null } */
export function splitPseudoElement(alt) {
  const m = alt.match(/::?(before|after)\s*$/);
  if (!m) return { host: alt, pe: null };
  return { host: alt.slice(0, m.index).trim() || "*", pe: m[1] };
}

const STATE = {
  "focus-visible": "data-sx-fv",
  focus: "data-sx-focus",
  hover: "data-sx-hover",
  "focus-within": null,
};
/** The selector with every state pseudo-class replaced by the attribute the plan puts on a node that
 *  must be in that state, so a candidate can be CHOSEN before any state is applied. */
export function relaxState(sel) {
  return sel
    .replace(/:focus-visible(?![\w-])/g, "[data-sx-fv]")
    .replace(/:focus(?![\w-])/g, "[data-sx-focus]")
    .replace(/:hover(?![\w-])/g, "[data-sx-hover]");
}
export function hasState(sel) {
  return /:(focus-visible|focus|hover|active|focus-within)(?![\w-])/.test(sel);
}

// ── Candidate generation ──────────────────────────────────────────────────────────────────────────
const STRUCT = new Set(["first-child", "last-child", "only-child", "first-of-type", "last-of-type", "empty"]);
const SUPPORTED = new Set([...STRUCT, "not", "has", "is", "where", "matches", ...Object.keys(STATE)]);

/** Order branches: those without a state pseudo-class first (a `[data-focus-visible]` alternative is
 *  buildable without driving focus), keeping source order otherwise. */
function preferStateless(list) {
  return [...list.filter((x) => !hasState(x)), ...list.filter((x) => hasState(x))];
}

function cloneCompound(c) {
  return { ...c, classes: [...c.classes], attrs: c.attrs.map((a) => ({ ...a })), pseudos: c.pseudos.map((p) => ({ ...p })) };
}
function mergeCompound(a, b) {
  const tagA = a.tag && a.tag !== "*" ? a.tag : null;
  const tagB = b.tag && b.tag !== "*" ? b.tag : null;
  if (tagA && tagB && tagA !== tagB) return null;
  if (a.pe && b.pe && a.pe !== b.pe) return null;
  return {
    tag: tagA ?? tagB ?? a.tag ?? b.tag,
    id: a.id ?? b.id,
    classes: [...a.classes, ...b.classes],
    attrs: [...a.attrs, ...b.attrs],
    pseudos: [...a.pseudos, ...b.pseudos],
    pe: a.pe ?? b.pe,
  };
}

/** Yield complex selectors equivalent to (a branch of) `steps` with every :is()/:where() resolved:
 *  a compound branch merges into its host compound; a complex branch is hoisted (its prefix becomes the
 *  host's ancestors / siblings), which is exact when the host is the first compound or is reached by a
 *  descendant combinator. */
export function* resolveIs(steps, budget = { n: 64 }) {
  const idx = steps.findIndex(({ c }) => c.pseudos.some((p) => ["is", "where", "matches"].includes(p.name)));
  if (idx < 0) {
    yield steps;
    return;
  }
  const step = steps[idx];
  const pIdx = step.c.pseudos.findIndex((p) => ["is", "where", "matches"].includes(p.name));
  const p = step.c.pseudos[pIdx];
  const rest = { ...cloneCompound(step.c) };
  rest.pseudos = step.c.pseudos.filter((_, k) => k !== pIdx);
  for (const branch of preferStateless(splitTop(p.arg))) {
    if (budget.n-- <= 0) return;
    let b;
    try {
      b = parseComplex(branch);
    } catch {
      continue;
    }
    const last = b.at(-1);
    const merged = mergeCompound(rest, last.c);
    if (!merged) continue;
    let next;
    if (b.length === 1) {
      next = [...steps.slice(0, idx), { comb: step.comb, c: merged }, ...steps.slice(idx + 1)];
    } else if (idx === 0 || step.comb === " ") {
      const prefix = b.slice(0, -1).map((x, k) => (k === 0 ? { comb: idx === 0 ? null : " ", c: x.c } : x));
      next = [...steps.slice(0, idx), ...prefix, { comb: last.comb, c: merged }, ...steps.slice(idx + 1)];
    } else continue; // a complex branch under a child / sibling combinator: not needed by the census
    yield* resolveIs(next, budget);
  }
}

// ── Plan building ─────────────────────────────────────────────────────────────────────────────────
// A plan node: { tag, cls[], attrs{}, children[], flags{}, state[], target?, filler? }

function node(tag = "div") {
  return { tag, cls: [], attrs: {}, children: [], flags: {}, state: [] };
}

const TABLE_PARENT = { tr: ["table", "tbody", "thead", "tfoot"], td: ["tr"], th: ["tr"], tbody: ["table"], thead: ["table"], tfoot: ["table"] };

class Unbuildable extends Error {}

/** Apply a compound (no :is left) to a plan node. `siblingsOf(n)` returns the array that holds n. */
function applyCompound(n, c, ctx) {
  if (c.tag && c.tag !== "*") {
    if (n.tagSet && n.tag !== c.tag) throw new Unbuildable(`tag ${n.tag} vs ${c.tag}`);
    n.tag = c.tag;
    n.tagSet = true;
  }
  if (c.id) n.attrs.id = c.id;
  for (const k of c.classes) if (!n.cls.includes(k)) n.cls.push(k);
  for (const a of c.attrs) {
    if (a.op === null) {
      if (!(a.name in n.attrs)) n.attrs[a.name] = "";
    } else n.attrs[a.name] = a.value;
  }
  for (const p of c.pseudos) {
    if (!SUPPORTED.has(p.name)) throw new Unbuildable(`:${p.name} is not supported`);
    if (STRUCT.has(p.name)) {
      if (p.name === "only-child") n.flags.first = n.flags.last = true;
      else if (p.name === "first-child" || p.name === "first-of-type") n.flags.first = true;
      else if (p.name === "last-child" || p.name === "last-of-type") n.flags.last = true;
      else if (p.name === "empty") n.flags.empty = true;
    } else if (p.name in STATE) {
      if (p.name === "focus-within") throw new Unbuildable(":focus-within");
      n.state.push(p.name);
      if (p.name === "focus-visible") {
        n.attrs["data-sx-fv"] = "";
        n.attrs["data-sx-focus"] = "";
      } else if (p.name === "focus") n.attrs["data-sx-focus"] = "";
      else n.attrs["data-sx-hover"] = "";
    } else if (p.name === "not") {
      for (const arg of splitTop(p.arg)) {
        let steps;
        try {
          steps = parseComplex(arg);
        } catch {
          continue;
        }
        if (steps.length !== 1) continue;
        const nc = steps[0].c;
        for (const q of nc.pseudos) {
          if (q.name === "first-child" || q.name === "first-of-type") n.flags.notFirst = true;
          if (q.name === "last-child" || q.name === "last-of-type") n.flags.notLast = true;
          if (q.name === "only-child") n.flags.notOnly = true;
        }
        // :not(.x) / :not([x]) / :not(tag) / :not(:has(…)) / :not(:focus): simply not added.
        if (nc.tag && nc.tag !== "*" && !n.tagSet && nc.classes.length === 0 && nc.attrs.length === 0) n.notTag = nc.tag;
      }
    } else if (p.name === "has") {
      ctx.pending.push({ n, arg: p.arg });
    }
  }
}

function place(parent, child, after = null) {
  child.parent = parent;
  if (after) parent.children.splice(parent.children.indexOf(after) + 1, 0, child);
  else parent.children.push(child);
}

/** Build a plan for one resolved complex selector under `root` (a container node). → target node. */
function buildSteps(steps, root, ctx, start = null) {
  let cur = start;
  for (let k = 0; k < steps.length; k++) {
    const { comb, c } = steps[k];
    const n = node(c.tag && c.tag !== "*" ? c.tag : "div");
    if (cur === null) place(root, n);
    else if (comb === " " || comb === ">") {
      // A descendant combinator lets a valid table structure be inserted around table parts.
      let parent = cur;
      if (comb === " " && TABLE_PARENT[n.tag] && !TABLE_PARENT[n.tag].includes(parent.tag)) {
        if (n.tag === "tr") {
          const t = node("table");
          const b = node("tbody");
          place(parent, t);
          place(t, b);
          parent = b;
        } else if (n.tag === "td" || n.tag === "th") {
          const t = node("table");
          const b = node("tbody");
          const r = node("tr");
          place(parent, t);
          place(t, b);
          place(b, r);
          parent = r;
        }
      }
      place(parent, n);
    } else if (comb === "+" || comb === "~") {
      if (!cur.parent) throw new Unbuildable("sibling of the root");
      place(cur.parent, n, cur);
      n.linkedPrev = cur;
      cur.linkedNext = n;
    } else throw new Unbuildable(`combinator ${comb}`);
    applyCompound(n, c, ctx);
    cur = n;
  }
  return cur;
}

function resolveHas(ctx) {
  while (ctx.pending.length) {
    const { n, arg } = ctx.pending.shift();
    let built = false;
    for (const rel of preferStateless(splitTop(arg))) {
      let steps;
      try {
        steps = parseComplex(rel, true);
      } catch {
        continue;
      }
      const first = steps[0];
      const resolved = resolveIs([{ comb: null, c: first.c }, ...steps.slice(1)]).next().value;
      if (!resolved) continue;
      const head = node(resolved[0].c.tag && resolved[0].c.tag !== "*" ? resolved[0].c.tag : "div");
      if (first.comb === " " || first.comb === ">") place(n, head);
      else {
        if (!n.parent) throw new Unbuildable(":has(+…) on the root");
        place(n.parent, head, n);
        head.linkedPrev = n;
        n.linkedNext = head;
      }
      applyCompound(head, resolved[0].c, ctx);
      buildSteps(resolved.slice(1), null, ctx, head);
      built = true;
      break;
    }
    if (!built) throw new Unbuildable(`:has(${arg})`);
  }
}

/** Structural fix-up: fillers so a node flagged first/last is exactly that (and not also only-child by
 *  accident), and a :not(:first-child) node has something before it. */
function finalize(n) {
  const kids = n.children;
  for (const k of [...kids]) {
    const f = k.flags;
    const i = () => kids.indexOf(k);
    const linked = k.linkedPrev || k.linkedNext;
    if (f.first && i() !== 0 && !k.linkedPrev) {
      kids.splice(i(), 1);
      kids.unshift(k);
    }
    if (f.last && i() !== kids.length - 1 && !k.linkedNext) {
      kids.splice(i(), 1);
      kids.push(k);
    }
    if (f.notFirst && i() === 0) kids.unshift(filler(k));
    if (f.notLast && i() === kids.length - 1) kids.push(filler(k));
    if (f.notOnly && kids.length === 1) {
      if (f.last) kids.unshift(filler(k));
      else kids.push(filler(k));
    }
    // Exact position: a node that is first but not last gets a trailing sibling, and vice versa.
    if (f.first && !f.last && kids.length === 1 && !linked) kids.push(filler(k));
    if (f.last && !f.first && kids.length === 1 && !linked) kids.unshift(filler(k));
  }
  for (const k of kids) finalize(k);
}
function filler(like) {
  const f = node(like.tag === "td" || like.tag === "th" || like.tag === "tr" ? like.tag : "div");
  f.filler = true;
  return f;
}

function strip(n) {
  const out = { tag: n.notTag && n.tag === n.notTag ? "div" : n.tag, cls: n.cls, attrs: n.attrs, state: n.state };
  if (n.target) out.target = true;
  if (n.filler) out.filler = true;
  if (n.flags.empty) out.empty = true;
  out.children = n.children.map(strip);
  return out;
}

/** → { candidates: [{ alt, host, pe, state[], plan }], errors[] } for one row selector (a list). */
export function planRow(selectorList, { maxCandidates = 24 } = {}) {
  const candidates = [];
  const errors = [];
  for (const alt of preferStateless(splitTop(selectorList))) {
    const { host, pe } = splitPseudoElement(alt);
    let steps;
    try {
      steps = parseComplex(host);
    } catch (e) {
      errors.push(`${alt}: ${e.message}`);
      continue;
    }
    for (const resolved of resolveIs(steps)) {
      if (candidates.length >= maxCandidates) break;
      try {
        const root = node("section");
        const ctx = { pending: [] };
        const target = buildSteps(resolved, root, ctx);
        target.target = true;
        resolveHas(ctx);
        finalize(root);
        candidates.push({ alt, host, pe, state: [...new Set(collectState(root))], plan: root.children.map(strip) });
      } catch (e) {
        if (!(e instanceof Unbuildable)) throw e;
        errors.push(`${alt}: ${e.message}`);
      }
    }
  }
  return { candidates, errors };
}

function collectState(n) {
  return [...n.state, ...n.children.flatMap(collectState)];
}
