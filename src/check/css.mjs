// A small, tolerant CSS scanner for orumio-shape-check. Not a parser for every corner of CSS — it only
// has to find, with line numbers, the statements the checks look at: @-rules (with or without a
// block), rules (with nesting), declarations and comments. It understands `/* */` comments, quoted
// strings, parentheses (a `;` inside `url(…)` does not end a statement) and blocks nested to any depth
// (`@theme`, `@layer`, `@supports`, CSS nesting). No dependency: products install this package from
// git and run it with Node alone.

/**
 * @typedef {{type:"root", children:Node[]}} Root
 * @typedef {{type:"atrule", name:string, params:string, line:number, children:Node[]|null, parent:Node}} AtRule
 * @typedef {{type:"rule", selector:string, line:number, children:Node[], parent:Node}} Rule
 * @typedef {{type:"decl", prop:string, value:string, line:number, parent:Node}} Decl
 * @typedef {{type:"comment", text:string, line:number, endLine:number, parent:Node}} Comment
 * @typedef {Root|AtRule|Rule|Decl|Comment} Node
 */

/** Parse CSS text into a tree. Never throws: an unbalanced `}` is ignored, an unclosed block ends at EOF. */
export function parseCss(text) {
  /** @type {Root} */
  const root = { type: "root", children: [] };
  const comments = [];
  let parent = root;
  const stack = [];
  let buf = "";
  let bufLine = 0; // line of the first non-space char of the current statement
  let line = 1;
  let depth = 0; // parentheses
  const n = text.length;

  const pushChar = (ch) => {
    if (buf.trim() === "" && !/\s/.test(ch)) bufLine = line;
    buf += ch;
  };

  const flushStatement = () => {
    const s = buf.trim();
    buf = "";
    depth = 0;
    if (!s) return;
    if (s.startsWith("@")) {
      const m = /^@([\w-]+)\s*([\s\S]*)$/.exec(s);
      parent.children.push({ type: "atrule", name: m ? m[1] : s.slice(1), params: m ? m[2].trim() : "", line: bufLine, children: null, parent });
      return;
    }
    const colon = s.indexOf(":");
    if (colon === -1) return; // stray text: nothing a check looks at
    parent.children.push({ type: "decl", prop: s.slice(0, colon).trim(), value: s.slice(colon + 1).trim(), line: bufLine, parent });
  };

  for (let i = 0; i < n; i++) {
    const ch = text[i];
    // comment
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      const body = text.slice(i + 2, end === -1 ? n : end);
      const startLine = line;
      const nl = body.split("\n").length - 1;
      line += nl;
      if (buf.trim() === "") {
        const c = { type: "comment", text: body.trim(), line: startLine, endLine: line, parent };
        parent.children.push(c);
        comments.push(c);
      } else {
        comments.push({ type: "comment", text: body.trim(), line: startLine, endLine: line, parent });
        buf += " "; // a comment inside a statement is whitespace
      }
      i = stop - 1;
      continue;
    }
    // string
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && text[j] !== ch && text[j] !== "\n") {
        if (text[j] === "\\") j++;
        j++;
      }
      const str = text.slice(i, Math.min(j + 1, n));
      pushChar(str[0]);
      buf += str.slice(1);
      line += str.split("\n").length - 1;
      i = j;
      continue;
    }
    if (ch === "\n") {
      line++;
      buf += ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth > 0) {
      pushChar(ch);
      continue;
    }
    if (ch === ";") {
      flushStatement();
      continue;
    }
    if (ch === "{") {
      const prelude = buf.trim();
      const at = bufLine || line;
      buf = "";
      let node;
      if (prelude.startsWith("@")) {
        const m = /^@([\w-]+)\s*([\s\S]*)$/.exec(prelude);
        node = { type: "atrule", name: m ? m[1] : prelude.slice(1), params: m ? m[2].trim() : "", line: at, children: [], parent };
      } else {
        node = { type: "rule", selector: prelude.replace(/\s+/g, " "), line: at, children: [], parent };
      }
      parent.children.push(node);
      stack.push(parent);
      parent = node;
      continue;
    }
    if (ch === "}") {
      flushStatement();
      if (stack.length) parent = stack.pop();
      continue;
    }
    pushChar(ch);
  }
  flushStatement();
  return { root, comments };
}

/** Every node of a subtree, depth-first in source order. */
export function* walk(node) {
  for (const child of node.children ?? []) {
    yield child;
    if (child.children) yield* walk(child);
  }
}

/** `@import` statements at the top level of a stylesheet, in order, with their target. */
export function importsOf(root) {
  const out = [];
  for (const node of root.children) {
    if (node.type !== "atrule" || node.name.toLowerCase() !== "import") continue;
    const m = /^(?:url\(\s*)?(["'])(.*?)\1/.exec(node.params) ?? /^url\(\s*([^)\s]+)\s*\)/.exec(node.params);
    const target = m ? (m.length === 3 ? m[2] : m[1]) : node.params;
    out.push({ target, line: node.line, node });
  }
  return out;
}
