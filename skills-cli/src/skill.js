import { readFile } from "node:fs/promises";
import { join } from "node:path";

const NAME_RE = /^[a-z0-9](?:[a-z0-9]|-(?!-)){0,62}[a-z0-9]$|^[a-z0-9]$/;

/**
 * Read SKILL.md from a directory and return its parsed frontmatter.
 * Throws if SKILL.md is missing, frontmatter is missing, or required
 * fields are absent/invalid.
 */
export async function readSkill(skillDir) {
  const skillMdPath = join(skillDir, "SKILL.md");
  let raw;
  try {
    raw = await readFile(skillMdPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`SKILL.md not found in ${skillDir}`);
    }
    throw err;
  }

  const fm = extractFrontmatter(raw);
  if (!fm) {
    throw new Error(`${skillMdPath} is missing YAML frontmatter`);
  }
  const props = parseFrontmatter(fm);

  if (!props.name) {
    throw new Error(`${skillMdPath}: frontmatter is missing required "name" field`);
  }
  if (!NAME_RE.test(props.name)) {
    throw new Error(
      `${skillMdPath}: invalid name "${props.name}" (must be 1-64 lowercase alphanumeric/hyphen chars, no leading/trailing/consecutive hyphens)`,
    );
  }
  if (!props.description) {
    throw new Error(
      `${skillMdPath}: frontmatter is missing required "description" field`,
    );
  }

  return props;
}

function extractFrontmatter(content) {
  const stripped = content.replace(/^﻿/, "");
  if (!stripped.startsWith("---")) return null;
  const after = stripped.slice(3);
  const newlineIdx = after.indexOf("\n");
  if (newlineIdx === -1) return null;
  const body = after.slice(newlineIdx + 1);
  const match = body.match(/^---[ \t]*\r?\n?/m);
  if (!match) return null;
  return body.slice(0, match.index);
}

/**
 * Minimal YAML frontmatter parser. Handles the subset used by SKILL.md:
 * top-level "key: value" pairs, optional quoted values, and one-level
 * nested maps (used for `metadata`).
 */
function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  const result = {};
  let currentMap = null;
  let mapIndent = -1;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    if (currentMap && indent > mapIndent) {
      const kv = splitKeyValue(trimmed);
      if (kv) currentMap[kv.key] = kv.value;
      continue;
    }
    currentMap = null;
    mapIndent = -1;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const valuePart = trimmed.slice(colonIdx + 1).trim();

    if (valuePart === "") {
      currentMap = {};
      mapIndent = indent;
      result[key] = currentMap;
    } else {
      result[key] = unquote(valuePart);
    }
  }
  return result;
}

function splitKeyValue(line) {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return null;
  return {
    key: line.slice(0, colonIdx).trim(),
    value: unquote(line.slice(colonIdx + 1).trim()),
  };
}

function unquote(s) {
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    return s.slice(1, -1);
  }
  return s;
}
