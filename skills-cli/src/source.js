const OWNER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Parse a source string of the form:
 *   owner/repo
 *   owner/repo#ref
 *   owner/repo/sub/path
 *   owner/repo/sub/path#ref
 */
export function parseSource(input) {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error("source is required (e.g. owner/repo)");
  }

  let ref;
  let rest = input;
  const hashIdx = input.indexOf("#");
  if (hashIdx !== -1) {
    ref = input.slice(hashIdx + 1).trim();
    rest = input.slice(0, hashIdx);
    if (!ref) {
      throw new Error(`invalid source "${input}": empty ref after "#"`);
    }
  }

  const parts = rest.split("/").filter((p) => p.length > 0);
  if (parts.length < 2) {
    throw new Error(
      `invalid source "${input}": expected "owner/repo" (optionally with /subpath and #ref)`,
    );
  }

  const [owner, repo, ...subpathParts] = parts;
  if (!OWNER_RE.test(owner)) {
    throw new Error(`invalid source "${input}": invalid GitHub owner "${owner}"`);
  }
  if (!REPO_RE.test(repo)) {
    throw new Error(`invalid source "${input}": invalid GitHub repo "${repo}"`);
  }

  const subpath = subpathParts.join("/");
  return { owner, repo, subpath, ref };
}
