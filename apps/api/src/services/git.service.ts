import { execSync, exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const execAsync = promisify(exec);

function getRepoPath(owner: string, repo: string): string {
  return path.resolve(config.git.reposPath, owner, `${repo}.git`);
}

function ensureReposDir(owner: string) {
  const dir = path.resolve(config.git.reposPath, owner);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─────────────────────────────────────────────────────────
// Repository lifecycle
// ─────────────────────────────────────────────────────────

export async function initBareRepo(owner: string, repo: string, defaultBranch: string = 'main'): Promise<void> {
  ensureReposDir(owner);
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) {
    execSync(`git init --bare --initial-branch="${defaultBranch}" "${repoPath}"`);
    // Create initial config
    execSync(`git -C "${repoPath}" config http.receivepack true`);
    // Ensure HEAD points to the correct branch
    execSync(`git -C "${repoPath}" symbolic-ref HEAD refs/heads/${defaultBranch}`);
  }
}

export async function deleteRepo(owner: string, repo: string): Promise<void> {
  const repoPath = getRepoPath(owner, repo);
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }
}

export async function forkRepo(
  sourceOwner: string,
  sourceRepo: string,
  destOwner: string,
  destRepo: string
): Promise<void> {
  ensureReposDir(destOwner);
  const sourcePath = getRepoPath(sourceOwner, sourceRepo);
  const destPath = getRepoPath(destOwner, destRepo);
  execSync(`git clone --bare "${sourcePath}" "${destPath}"`);
}

export async function renameRepo(
  owner: string,
  oldName: string,
  newName: string
): Promise<void> {
  const oldPath = getRepoPath(owner, oldName);
  const newPath = getRepoPath(owner, newName);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
}

// ─────────────────────────────────────────────────────────
// Branches & Tags
// ─────────────────────────────────────────────────────────

export async function getBranches(owner: string, repo: string) {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return [];
  try {
    const { stdout } = await execAsync(
      `git -C "${repoPath}" branch -a --format="%(refname:short)|%(objectname:short)|%(objectname)"`,
    );
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, shortSha, sha] = line.split('|');
        return { name: name.replace('remotes/origin/', ''), sha, shortSha };
      })
      .filter((b) => b.name !== 'HEAD');
  } catch {
    return [];
  }
}

export async function getTags(owner: string, repo: string) {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return [];
  try {
    const { stdout } = await execAsync(
      `git -C "${repoPath}" tag -l --sort=-version:refname`
    );
    return stdout.trim().split('\n').filter(Boolean).map((name) => ({ name }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// File Tree
// ─────────────────────────────────────────────────────────

export async function getTree(
  owner: string,
  repo: string,
  ref: string,
  dirPath: string = ''
) {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return null;

  try {
    const treePath = dirPath ? `${ref}:${dirPath}` : ref;
    const { stdout } = await execAsync(
      `git -C "${repoPath}" ls-tree --long "${treePath}"`
    );

    if (!stdout.trim()) return [];

    const entries = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(\w+)\s+([a-f0-9]+)\s+(\S+)\s+(.+)$/);
        if (!match) return null;
        const [, mode, type, sha, size, name] = match;
        return {
          name,
          path: dirPath ? `${dirPath}/${name}` : name,
          type: type === 'tree' ? 'tree' : 'blob',
          sha,
          size: size === '-' ? 0 : parseInt(size),
          mode,
        };
      })
      .filter(Boolean);

    // Sort: directories first, then files
    return entries.sort((a: any, b: any) => {
      if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// File Content
// ─────────────────────────────────────────────────────────

export async function getBlob(
  owner: string,
  repo: string,
  ref: string,
  filePath: string
): Promise<{ content: string; size: number; encoding: string } | null> {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return null;

  try {
    const { stdout } = await execAsync(
      `git -C "${repoPath}" show "${ref}:${filePath}"`,
      { encoding: 'binary', maxBuffer: 50 * 1024 * 1024 }
    );
    const buffer = Buffer.from(stdout, 'binary');

    // Detect if binary
    const isBinary = buffer.slice(0, 8000).includes(0);
    if (isBinary) {
      return { content: buffer.toString('base64'), size: buffer.length, encoding: 'base64' };
    }
    return { content: buffer.toString('utf8'), size: buffer.length, encoding: 'utf8' };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Commit History
// ─────────────────────────────────────────────────────────

export async function getCommits(
  owner: string,
  repo: string,
  ref: string,
  options: { page?: number; limit?: number; path?: string } = {}
) {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return [];

  const { page = 1, limit = 30, path: filePath } = options;
  const skip = (page - 1) * limit;

  try {
    const pathArg = filePath ? `-- "${filePath}"` : '';
    const format = '%H|%h|%s|%aN|%aE|%aI|%P';
    const { stdout } = await execAsync(
      `git -C "${repoPath}" log "${ref}" --format="${format}" --skip=${skip} -n ${limit} ${pathArg}`
    );

    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, shortSha, message, authorName, authorEmail, authorDate, parents] = line.split('|');
        return {
          sha,
          shortSha,
          message,
          author: { name: authorName, email: authorEmail, date: authorDate },
          parents: parents ? parents.split(' ') : [],
        };
      });
  } catch {
    return [];
  }
}

export async function getCommit(owner: string, repo: string, sha: string) {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return null;

  try {
    const format = '%H|%h|%s|%b|%aN|%aE|%aI|%cN|%cE|%cI|%P';
    const { stdout: commitInfo } = await execAsync(
      `git -C "${repoPath}" show --no-patch --format="${format}" "${sha}"`
    );

    const line = commitInfo.trim().split('\n')[0];
    const [fullSha, shortSha, subject, body, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate, parents] = line.split('|');

    // Get diff stats
    const { stdout: statOut } = await execAsync(
      `git -C "${repoPath}" show --stat --format="" "${sha}"`
    );

    // Get full diff
    const { stdout: diffOut } = await execAsync(
      `git -C "${repoPath}" show --format="" "${sha}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    return {
      sha: fullSha,
      shortSha,
      message: subject,
      body,
      author: { name: authorName, email: authorEmail, date: authorDate },
      committer: { name: committerName, email: committerEmail, date: committerDate },
      parents: parents ? parents.split(' ') : [],
      stats: parseDiffStats(statOut),
      diff: diffOut,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Diff between commits/branches
// ─────────────────────────────────────────────────────────

export async function compareBranches(
  owner: string,
  repo: string,
  base: string,
  head: string
) {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return null;

  try {
    const { stdout: diffOut } = await execAsync(
      `git -C "${repoPath}" diff "${base}...${head}" --stat`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    const { stdout: logOut } = await execAsync(
      `git -C "${repoPath}" log "${base}..${head}" --format="%H|%h|%s|%aN|%aE|%aI"`
    );

    const commits = logOut.trim().split('\n').filter(Boolean).map((line) => {
      const [sha, shortSha, message, authorName, authorEmail, authorDate] = line.split('|');
      return { sha, shortSha, message, author: { name: authorName, email: authorEmail, date: authorDate } };
    });

    return { stats: parseDiffStats(diffOut), commits, ahead: commits.length };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Language detection
// ─────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  js: 'JavaScript', ts: 'TypeScript', py: 'Python', rb: 'Ruby',
  go: 'Go', rs: 'Rust', java: 'Java', cpp: 'C++', c: 'C',
  cs: 'C#', php: 'PHP', swift: 'Swift', kt: 'Kotlin',
  html: 'HTML', css: 'CSS', scss: 'SCSS', vue: 'Vue',
  md: 'Markdown', json: 'JSON', yaml: 'YAML', yml: 'YAML',
  sh: 'Shell', bash: 'Shell', dockerfile: 'Dockerfile',
};

export async function detectLanguages(owner: string, repo: string, ref: string) {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return {};

  try {
    const { stdout } = await execAsync(
      `git -C "${repoPath}" ls-tree -r --name-only "${ref}"`
    );

    const counts: Record<string, number> = {};
    const files = stdout.trim().split('\n').filter(Boolean);

    for (const file of files) {
      const ext = file.split('.').pop()?.toLowerCase() || '';
      const lang = LANG_MAP[ext];
      if (lang) counts[lang] = (counts[lang] || 0) + 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) return {};

    const percentages: Record<string, number> = {};
    for (const [lang, count] of Object.entries(counts)) {
      percentages[lang] = Math.round((count / total) * 1000) / 10;
    }

    return percentages;
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function parseDiffStats(statOut: string) {
  const match = statOut.match(/(\d+) files? changed(?:, (\d+) insertions?)?(?:, (\d+) deletions?)?/);
  if (!match) return { files: 0, additions: 0, deletions: 0 };
  return {
    files: parseInt(match[1] || '0'),
    additions: parseInt(match[2] || '0'),
    deletions: parseInt(match[3] || '0'),
  };
}

export function repoExists(owner: string, repo: string): boolean {
  return fs.existsSync(getRepoPath(owner, repo));
}

export { getRepoPath };
