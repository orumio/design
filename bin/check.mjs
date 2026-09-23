#!/usr/bin/env node
// orumio-shape-check — holds a product to SHAPE.md §4. Run from the product's app directory:
//
//   orumio-shape-check --profile app|site [--entry <css file>] [--root <dir>] [--outdated]
//
// Node built-ins only: products install this package from git and run it as it is. Exit 1 on any FAIL,
// 2 on a usage error. Only --outdated touches the network.
import { parseArgs } from "node:util";
import { runChecks, formatReport, exitCode } from "../src/check/index.mjs";

const USAGE = "usage: orumio-shape-check --profile app|site [--entry <css file>] [--root <dir>] [--outdated]";

let args;
try {
  ({ values: args } = parseArgs({
    options: {
      profile: { type: "string" },
      entry: { type: "string" },
      root: { type: "string" },
      outdated: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  }));
} catch (e) {
  console.error(`${e.message}\n${USAGE}`);
  process.exit(2);
}
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
if (args.profile !== "app" && args.profile !== "site") {
  console.error(USAGE);
  process.exit(2);
}

const result = runChecks({ root: args.root ?? process.cwd(), profile: args.profile, entry: args.entry, outdated: args.outdated });
console.log(formatReport(result, { color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR }));
process.exitCode = exitCode(result.rows);
