// The file walk shared by every check: a product's own files under its root, never its dependencies
// or its build output. Symlinked directories are not followed (pnpm links workspace packages into
// node_modules, and a link can point outside the product).
import fs from "node:fs";
import path from "node:path";

export const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".open-next",
  "dist",
  "out",
  "build",
  ".wrangler",
  "coverage",
  "test-results",
  "playwright-report",
  ".git",
]);

/** Build output is never product code. Next.js also writes to any `distDir` a product names, and
 * products name them `.next-<purpose>` (product-video-engine's `.next-e2e`), so the prefix is ignored. */
export const isIgnoredDir = (name) => IGNORED_DIRS.has(name) || name.startsWith(".next-");

const MAX_BYTES = 2 * 1024 * 1024; // a bigger "source" file is generated output, not product code

/** Every file under `root` (absolute paths, sorted) whose name `accept` returns true for. */
export function listFiles(root, accept) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!isIgnoredDir(e.name)) visit(full);
      } else if (e.isFile() && accept(e.name)) {
        try {
          if (fs.statSync(full).size <= MAX_BYTES) out.push(full);
        } catch {
          /* vanished */
        }
      }
    }
  };
  visit(root);
  return out.sort();
}

export const isCss = (name) => name.endsWith(".css");
export const isScript = (name) => /\.(tsx|jsx|ts|js)$/.test(name) && !name.endsWith(".d.ts");
export const DEVIATIONS_FILE = "shape.deviations.css";
