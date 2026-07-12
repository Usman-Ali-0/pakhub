import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import * as gitService from '../services/git.service';
import { createError } from '../middleware/error.middleware';
import { emitToUser } from '../lib/socket';

const router = Router();

// ─────────────────────────────────────────────────────────
// Repo select fields helper
// ─────────────────────────────────────────────────────────
const repoSelect = {
  id: true, name: true, description: true, isPrivate: true,
  defaultBranch: true, ownerId: true, orgId: true, forkedFromId: true,
  isArchived: true, website: true, topics: true, size: true,
  starsCount: true, forksCount: true, watchersCount: true,
  openIssuesCount: true, language: true, createdAt: true, updatedAt: true,
  owner: { select: { id: true, username: true, name: true, avatarUrl: true } },
  forkedFrom: {
    select: {
      id: true, name: true,
      owner: { select: { username: true } },
    },
  },
};

// GET /api/repos/:owner/:repo
router.get('/:owner/:repo', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
    if (!ownerUser) throw createError('User not found', 404);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: ownerUser.id, name: repo },
      select: repoSelect,
    });
    if (!repository) throw createError('Repository not found', 404);
    if (repository.isPrivate && req.user?.id !== ownerUser.id) {
      throw createError('Repository not found', 404);
    }

    let isStarred = false;
    let isWatched = false;
    if (req.user) {
      const [star, watch] = await Promise.all([
        prisma.star.findUnique({ where: { userId_repoId: { userId: req.user.id, repoId: repository.id } } }),
        prisma.watch.findUnique({ where: { userId_repoId: { userId: req.user.id, repoId: repository.id } } }),
      ]);
      isStarred = !!star;
      isWatched = !!watch;
    }

    res.json({ success: true, data: { ...repository, isStarred, isWatched } });
  } catch (err) { next(err); }
});

// POST /api/repos — Create repository
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid repo name'),
      description: z.string().max(500).optional(),
      isPrivate: z.boolean().default(false),
      defaultBranch: z.string().default('main'),
      website: z.string().url().optional().or(z.literal('')),
      topics: z.array(z.string()).max(20).default([]),
      initReadme: z.boolean().optional(),
      gitignore: z.string().optional(),
      license: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const existing = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: data.name },
    });
    if (existing) throw createError('Repository name already exists', 409);

    const repo = await prisma.repository.create({
      data: { 
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate,
        defaultBranch: data.defaultBranch,
        website: data.website,
        topics: data.topics,
        ownerId: req.user!.id 
      },
      select: repoSelect,
    });

    // Initialize bare git repo on disk
    await gitService.initBareRepo(req.user!.username, data.name, data.defaultBranch);

    // If initReadme, gitignore, or license are requested, make an initial commit
    if (data.initReadme || data.gitignore || data.license) {
      const fs = require('fs');
      const path = require('path');
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      const { v4: uuidv4 } = require('uuid');

      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const workDir = path.join(uploadsDir, `init-${uuidv4()}`);
      fs.mkdirSync(workDir, { recursive: true });

      try {
        const repoPath = gitService.getRepoPath(req.user!.username, data.name);
        await execPromise(`git clone "${repoPath}" "${workDir}"`);
        
        if (data.initReadme) {
          const readmeContent = `# ${data.name}\n\n${data.description || ''}`;
          fs.writeFileSync(path.join(workDir, 'README.md'), readmeContent);
        }
        if (data.gitignore) {
          fs.writeFileSync(path.join(workDir, '.gitignore'), `# ${data.gitignore} gitignore\n`);
        }
        if (data.license) {
          fs.writeFileSync(path.join(workDir, 'LICENSE'), `${data.license} License\n`);
        }

        await execPromise(`git config user.name "${req.user!.username}"`, { cwd: workDir });
        await execPromise(`git config user.email "${req.user!.email}"`, { cwd: workDir });
        await execPromise(`git add .`, { cwd: workDir });
        await execPromise(`git commit -m "Initial commit"`, { cwd: workDir });
        await execPromise(`git push origin HEAD:${data.defaultBranch}`, { cwd: workDir });
      } catch (err) {
        console.error('Failed to initialize repo contents:', err);
      } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    }

    // Auto-watch
    await prisma.watch.create({ data: { userId: req.user!.id, repoId: repo.id } });
    await prisma.repository.update({ where: { id: repo.id }, data: { watchersCount: 1 } });

    res.status(201).json({ success: true, data: repo });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0]?.message });
    }
    next(err);
  }
});

// PUT /api/repos/:owner/:repo — Update repo settings
router.put('/:owner/:repo', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
    if (!ownerUser || ownerUser.id !== req.user!.id) throw createError('Forbidden', 403);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: repo },
    });
    if (!repository) throw createError('Repository not found', 404);

    const schema = z.object({
      description: z.string().max(500).optional(),
      isPrivate: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      website: z.string().url().optional().or(z.literal('')),
      topics: z.array(z.string()).max(20).optional(),
      isArchived: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    const updated = await prisma.repository.update({
      where: { id: repository.id },
      data,
      select: repoSelect,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// DELETE /api/repos/:owner/:repo — Delete repository
router.delete('/:owner/:repo', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;

    const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
    if (!ownerUser) throw createError('User not found', 404);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: ownerUser.id, name: repo },
    });
    if (!repository) throw createError('Repository not found', 404);
    if (repository.ownerId !== req.user!.id) throw createError('Forbidden', 403);

    // Delete from database
    await prisma.repository.delete({ where: { id: repository.id } });

    // Delete from filesystem
    const repoPath = gitService.getRepoPath(owner, repo);
    const fs = require('fs');
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }

    res.json({ success: true, message: 'Repository deleted successfully' });
  } catch (err) { next(err); }
});

// POST /api/repos/:owner/:repo/fork — Fork repository
router.post('/:owner/:repo/fork', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
    if (!ownerUser) throw createError('User not found', 404);

    const source = await prisma.repository.findFirst({
      where: { ownerId: ownerUser.id, name: repo, isPrivate: false },
    });
    if (!source) throw createError('Repository not found', 404);

    const existing = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: repo },
    });
    const forkName = existing ? `${repo}-fork` : repo;

    const fork = await prisma.repository.create({
      data: {
        name: forkName,
        description: source.description,
        isPrivate: false,
        defaultBranch: source.defaultBranch,
        ownerId: req.user!.id,
        forkedFromId: source.id,
        topics: source.topics,
        language: source.language,
      },
      select: repoSelect,
    });

    // Clone git repo
    await gitService.forkRepo(owner, repo, req.user!.username, forkName);

    // Update fork count
    await prisma.repository.update({
      where: { id: source.id },
      data: { forksCount: { increment: 1 } },
    });

    res.status(201).json({ success: true, data: fork });
  } catch (err) { next(err); }
});

// POST /api/repos/:owner/:repo/star
router.post('/:owner/:repo/star', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user?.id);

    const existing = await prisma.star.findUnique({
      where: { userId_repoId: { userId: req.user!.id, repoId: repo.id } },
    });

    if (existing) {
      await prisma.star.delete({ where: { id: existing.id } });
      await prisma.repository.update({ where: { id: repo.id }, data: { starsCount: { decrement: 1 } } });
      return res.json({ success: true, data: { starred: false } });
    }

    await prisma.star.create({ data: { userId: req.user!.id, repoId: repo.id } });
    await prisma.repository.update({ where: { id: repo.id }, data: { starsCount: { increment: 1 } } });
    res.json({ success: true, data: { starred: true } });
  } catch (err) { next(err); }
});

// GET /api/repos/:owner/:repo/branches
router.get('/:owner/:repo/branches', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const branches = await gitService.getBranches(owner, repo);
    res.json({ success: true, data: branches });
  } catch (err) { next(err); }
});

// GET /api/repos/:owner/:repo/tags
router.get('/:owner/:repo/tags', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const tags = await gitService.getTags(owner, repo);
    res.json({ success: true, data: tags });
  } catch (err) { next(err); }
});

// GET /api/repos/:owner/:repo/languages
router.get('/:owner/:repo/languages', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repoData = await getRepo(owner, repo, req.user?.id);
    const langs = await gitService.detectLanguages(owner, repo, repoData.defaultBranch);
    res.json({ success: true, data: langs });
  } catch (err) { next(err); }
});

// GET /api/repos/:owner/:repo/contributors
router.get('/:owner/:repo/contributors', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const commits = await gitService.getCommits(owner, repo, 'HEAD', { limit: 500 });
    const counts: Record<string, { name: string; email: string; count: number }> = {};
    for (const c of commits) {
      const key = c.author.email;
      if (!counts[key]) counts[key] = { name: c.author.name, email: c.author.email, count: 0 };
      counts[key].count++;
    }
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 50);
    res.json({ success: true, data: sorted });
  } catch (err) { next(err); }
});

// Helper
async function getRepo(owner: string, repo: string, userId?: string) {
  const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
  if (!ownerUser) throw createError('User not found', 404);
  const repository = await prisma.repository.findFirst({
    where: { ownerId: ownerUser.id, name: repo },
  });
  if (!repository) throw createError('Repository not found', 404);
  if (repository.isPrivate && userId !== ownerUser.id) throw createError('Repository not found', 404);
  return repository;
}

// GET /api/repos/:owner/:repo/releases
router.get('/:owner/:repo/releases', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repoData = await getRepo(owner, repo, req.user?.id);
    const releases = await prisma.release.findMany({
      where: { repoId: repoData.id },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        assets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: releases });
  } catch (err) { next(err); }
});

// POST /api/repos/:owner/:repo/releases
router.post('/:owner/:repo/releases', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repoData = await getRepo(owner, repo, req.user!.id);
    const schema = z.object({
      tagName: z.string().min(1),
      name: z.string().optional(),
      body: z.string().optional(),
      isDraft: z.boolean().default(false),
      isPrerelease: z.boolean().default(false),
    });
    const data = schema.parse(req.body);

    const release = await prisma.release.create({
      data: {
        repoId: repoData.id,
        tagName: data.tagName,
        name: data.name,
        body: data.body,
        isDraft: data.isDraft,
        isPrerelease: data.isPrerelease,
        authorId: req.user!.id,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        assets: true,
      },
    });
    res.status(201).json({ success: true, data: release });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

export default router;
