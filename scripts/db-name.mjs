import { execSync } from "node:child_process";

// Per-worktree database isolation. The dev DATABASE_URL is committed (in .env.development) with a
// shared BASE name (kokekompis_dev). The MAIN checkout uses that base as-is. A linked git worktree,
// however, derives its OWN database by suffixing the base with the worktree name — so two worktrees
// on the same machine never clobber each other's data. Nothing per-worktree is stored: the suffix is
// computed from git. Set NO_WORKTREE_DB=1 to opt out (use the base name verbatim).

function gitOut(args) {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return ""; // not a git repo (e.g. a deploy container) → no suffix, use the base name
  }
}

// "" for the main checkout / non-worktree / non-git; the sanitized worktree name for a linked worktree.
// A linked worktree's git-dir lives at <repo>/.git/worktrees/<name>; the main checkout's is just ".git".
export function worktreeSuffix() {
  if (process.env.NO_WORKTREE_DB) return "";
  const gitDir = gitOut("rev-parse --git-dir");
  const m = gitDir.match(/\/worktrees\/([^/\s]+)\/?$/);
  if (!m) return "";
  return m[1]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

// Append the worktree suffix to the database name in a connection URL, leaving credentials, host, port,
// and query string intact. A no-op in the main checkout (empty suffix) or when the URL has no db name.
export function deriveDbUrl(url) {
  const suffix = worktreeSuffix();
  if (!url || !suffix) return url;
  const u = new URL(url);
  const dbName = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!dbName) return url;
  u.pathname = `/${dbName}_${suffix}`;
  return u.toString();
}
