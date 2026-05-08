import { cp, rm, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import { ensureDir, fetchRepo } from "./github.js";
import { readSkill } from "./skill.js";
import { parseSource } from "./source.js";

const DEFAULT_DIR = "skills";

/**
 * Install a skill from a GitHub repository.
 *
 * source: owner/repo[/subpath][#ref]
 * options: { dir?, ref?, force?, cwd? }
 */
export async function addSkill(source, options = {}) {
  const { owner, repo, subpath, ref: refFromSource } = parseSource(source);
  const ref = options.ref ?? refFromSource;
  const cwd = options.cwd ?? process.cwd();
  const targetRoot = resolveTarget(options.dir ?? DEFAULT_DIR, cwd);

  log(`Fetching ${owner}/${repo}${ref ? `@${ref}` : ""}…`);
  const fetched = await fetchRepo({ owner, repo, ref });
  try {
    const skillSrc = subpath ? join(fetched.root, subpath) : fetched.root;
    await assertDir(skillSrc, subpath ? `path "${subpath}"` : "repository root");

    const props = await readSkill(skillSrc);

    await ensureDir(targetRoot);
    const targetPath = join(targetRoot, props.name);
    if (await exists(targetPath)) {
      if (!options.force) {
        throw new Error(
          `skill "${props.name}" already exists at ${targetPath} (use --force to overwrite)`,
        );
      }
      await rm(targetPath, { recursive: true, force: true });
    }

    await cp(skillSrc, targetPath, { recursive: true });
    log(`Installed "${props.name}" → ${targetPath} (from ${owner}/${repo}@${fetched.ref})`);
    return { name: props.name, path: targetPath, ref: fetched.ref };
  } finally {
    await rm(fetched.tempDir, { recursive: true, force: true });
  }
}

function resolveTarget(dir, cwd) {
  return isAbsolute(dir) ? dir : resolve(cwd, dir);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

async function assertDir(path, label) {
  let info;
  try {
    info = await stat(path);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`${label} does not exist in the downloaded repository`);
    }
    throw err;
  }
  if (!info.isDirectory()) {
    throw new Error(`${label} is not a directory in the downloaded repository`);
  }
}

function log(msg) {
  process.stderr.write(`${msg}\n`);
}
