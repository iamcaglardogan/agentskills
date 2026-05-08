#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { addSkill } from "../src/add.js";

const USAGE = `Usage: skills <command> [options]

Commands:
  add <owner/repo>[/subpath][#ref]   Install a skill from a GitHub repo

Options for "add":
  --dir <path>     Directory to install the skill into (default: ./skills)
  --ref <name>     Git ref (branch, tag, or commit) to fetch
  --force          Overwrite an existing skill of the same name

Other:
  -h, --help       Show this help
  -v, --version    Show version

Examples:
  npx skills add anthropics/skills/skills/canvas-design
  npx skills add my-org/my-skill --dir ./.skills
  npx skills add my-org/my-skill#v1.2.0 --force
`;

async function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (args[0] === "-v" || args[0] === "--version") {
    process.stdout.write(`${await readVersion()}\n`);
    return 0;
  }

  const command = args[0];
  switch (command) {
    case "add":
      return await runAdd(args.slice(1));
    case "help":
      process.stdout.write(USAGE);
      return 0;
    default:
      process.stderr.write(`skills: unknown command "${command}"\n\n${USAGE}`);
      return 2;
  }
}

async function runAdd(args) {
  const opts = { positional: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--force") opts.force = true;
    else if (a === "--dir") opts.dir = requireValue(args, ++i, "--dir");
    else if (a === "--ref") opts.ref = requireValue(args, ++i, "--ref");
    else if (a === "--help" || a === "-h") {
      process.stdout.write(USAGE);
      return 0;
    } else if (a.startsWith("-")) {
      throw new Error(`unknown option "${a}"`);
    } else {
      opts.positional.push(a);
    }
  }
  if (opts.positional.length === 0) {
    throw new Error('"skills add" requires a source (e.g. owner/repo)');
  }
  if (opts.positional.length > 1) {
    throw new Error(`"skills add" takes a single source, got ${opts.positional.length}`);
  }
  await addSkill(opts.positional[0], {
    dir: opts.dir,
    ref: opts.ref,
    force: opts.force,
  });
  return 0;
}

function requireValue(args, idx, flag) {
  const v = args[idx];
  if (v === undefined || v.startsWith("-")) {
    throw new Error(`${flag} requires a value`);
  }
  return v;
}

async function readVersion() {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await readFile(join(here, "..", "package.json"), "utf8"));
  return pkg.version;
}

main(process.argv).then(
  (code) => process.exit(code ?? 0),
  (err) => {
    process.stderr.write(`skills: ${err.message}\n`);
    process.exit(1);
  },
);
