// orumio-shape-check, as functions: run every check against a product root and format the report.
// bin/check.mjs is the CLI around this; tests call it directly.
import { createContext } from "./context.mjs";
import {
  checkEntry,
  checkDeviations,
  checkNoShapeOutside,
  checkNoAdHocRadiusInScripts,
  checkCensused,
  checkProClassified,
  checkOutdated,
} from "./rules.mjs";

/** → { ctx, rows } — one row per check, in order 1…7. */
export function runChecks({ root = process.cwd(), profile, entry, outdated = false, lsRemote } = {}) {
  const ctx = createContext({ root, profile, entry });
  const rows = [
    checkEntry(ctx),
    checkDeviations(ctx),
    checkNoShapeOutside(ctx),
    checkNoAdHocRadiusInScripts(ctx),
    checkCensused(ctx),
    checkProClassified(ctx),
    checkOutdated({ enabled: outdated, ...(lsRemote ? { lsRemote } : {}) }),
  ];
  return { ctx, rows };
}

const COLORS = { PASS: "\x1b[32m", FAIL: "\x1b[31m", WARN: "\x1b[33m", SKIP: "\x1b[2m" };

export function formatReport({ ctx, rows }, { color = false } = {}) {
  const paint = (r) => (color ? `${COLORS[r]}${r.padEnd(4)}\x1b[0m` : r.padEnd(4));
  const lines = [];
  lines.push(`orumio-shape-check — profile ${ctx.profile.name}, root ${ctx.root}, entry ${ctx.entry ? ctx.rel(ctx.entry) : "(none)"}`);
  lines.push("");
  lines.push("#  RESULT  CHECK");
  for (const r of rows) lines.push(`${String(r.id).padEnd(2)} ${paint(r.result)}    ${r.title} — ${r.summary}`);
  const withDetails = rows.filter((r) => (r.result === "FAIL" || r.result === "WARN") && r.details.length);
  if (withDetails.length) {
    lines.push("");
    for (const r of withDetails) {
      lines.push(`${r.result} #${r.id} ${r.title}`);
      for (const d of r.details) {
        const where = d.file ? `${d.file}${d.line ? `:${d.line}` : ""}: ` : "";
        lines.push(`  ${where}${d.message}`);
      }
    }
  }
  const fails = rows.filter((r) => r.result === "FAIL").length;
  lines.push("");
  lines.push(fails ? `${fails} check${fails === 1 ? "" : "s"} failed` : "all checks passed");
  return lines.join("\n");
}

export const exitCode = (rows) => (rows.some((r) => r.result === "FAIL") ? 1 : 0);
