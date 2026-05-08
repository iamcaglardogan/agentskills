import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

/**
 * Download a GitHub repo's tarball and extract it into a fresh temporary
 * directory. Returns the path to the extracted root (the single top-level
 * directory inside the tarball).
 *
 * If `ref` is omitted, the repository's default branch is used.
 */
export async function fetchRepo({ owner, repo, ref }) {
  const target = ref ?? (await getDefaultBranch(owner, repo));
  const tarballUrl = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tar.gz/${encodeURIComponent(target)}`;

  const tempDir = await mkdtemp(join(tmpdir(), "skills-cli-"));
  try {
    const res = await fetch(tarballUrl, {
      headers: { "User-Agent": "skills-cli" },
      redirect: "follow",
    });
    if (!res.ok || !res.body) {
      await rm(tempDir, { recursive: true, force: true });
      throw new Error(
        `failed to download ${owner}/${repo}@${target}: HTTP ${res.status} ${res.statusText}`,
      );
    }

    await extractTarGz(res.body, tempDir);

    const entries = await readdir(tempDir);
    if (entries.length !== 1) {
      throw new Error(
        `unexpected tarball layout for ${owner}/${repo}@${target}: found ${entries.length} top-level entries`,
      );
    }
    return { root: join(tempDir, entries[0]), tempDir, ref: target };
  } catch (err) {
    await rm(tempDir, { recursive: true, force: true });
    throw err;
  }
}

async function getDefaultBranch(owner, repo) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers = { "User-Agent": "skills-cli", Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`repository ${owner}/${repo} not found (HTTP 404)`);
    }
    throw new Error(
      `failed to look up default branch for ${owner}/${repo}: HTTP ${res.status} ${res.statusText}`,
    );
  }
  const body = await res.json();
  if (!body.default_branch) {
    throw new Error(`GitHub API did not return default_branch for ${owner}/${repo}`);
  }
  return body.default_branch;
}

function extractTarGz(webStream, destDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", ["-xzf", "-", "-C", destDir], {
      stdio: ["pipe", "inherit", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });

    const nodeStream = Readable.fromWeb(webStream);
    nodeStream.on("error", reject);
    nodeStream.pipe(proc.stdin);
  });
}

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}
