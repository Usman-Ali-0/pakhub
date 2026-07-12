import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();

const issueSelect = {
  id: true, repoId: true, number: true, title: true, body: true,
  state: true, authorId: true, milestoneId: true,
  createdAt: true, updatedAt: true, closedAt: true,
  author: { select: { id: true, username: true, name: true, avatarUrl: true } },
  labels: { include: { label: true } },
  assignees: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
  milestone: true,
  _count: { select: { comments: true } },
};

async function getRepoByOwnerName(owner: string, repoName: string, userId?: string) {
  const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
  if (!ownerUser) throw createError('User not found', 404);
  const repo = await prisma.repository.findFirst({
    where: { ownerId: ownerUser.id, name: repoName },
  });
  if (!repo) throw createError('Repository not found', 404);
  if (repo.isPrivate && userId !== ownerUser.id) throw createError('Repository not found', 404);
  return repo;
}

// GET /api/issues/:owner/:repo
router.get('/:owner/:repo', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user?.id);
    const state = (req.query.state as string) || 'OPEN';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const labelFilter = req.query.label as string;

    const where: any = { repoId: repo.id, state };
    if (labelFilter) {
      where.labels = { some: { label: { name: labelFilter } } };
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        select: issueSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.issue.count({ where }),
    ]);

    res.json({
      success: true,
      data: issues.map(formatIssue),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// GET /api/issues/:owner/:repo/:number
router.get('/:owner/:repo/:number', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user?.id);
    const issue = await prisma.issue.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
      select: issueSelect,
    });
    if (!issue) throw createError('Issue not found', 404);
    res.json({ success: true, data: formatIssue(issue) });
  } catch (err) { next(err); }
});

// POST /api/issues/:owner/:repo — Create issue
router.post('/:owner/:repo', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user!.id);
    const schema = z.object({
      title: z.string().min(1).max(500),
      body: z.string().max(65536).optional(),
      labelIds: z.array(z.string()).optional(),
      assigneeIds: z.array(z.string()).optional(),
      milestoneId: z.string().optional(),
    });
    const data = schema.parse(req.body);

    // Get next issue number
    const lastIssue = await prisma.issue.findFirst({
      where: { repoId: repo.id },
      orderBy: { number: 'desc' },
    });
    const number = (lastIssue?.number || 0) + 1;

    const issue = await prisma.issue.create({
      data: {
        repoId: repo.id,
        number,
        title: data.title,
        body: data.body,
        authorId: req.user!.id,
        milestoneId: data.milestoneId,
        labels: data.labelIds
          ? { create: data.labelIds.map((id) => ({ labelId: id })) }
          : undefined,
        assignees: data.assigneeIds
          ? { create: data.assigneeIds.map((id) => ({ userId: id })) }
          : undefined,
      },
      select: issueSelect,
    });

    await prisma.repository.update({
      where: { id: repo.id },
      data: { openIssuesCount: { increment: 1 } },
    });

    res.status(201).json({ success: true, data: formatIssue(issue) });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

// PATCH /api/issues/:owner/:repo/:number — Update issue
router.patch('/:owner/:repo/:number', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user!.id);
    const schema = z.object({
      title: z.string().min(1).max(500).optional(),
      body: z.string().max(65536).optional(),
      state: z.enum(['OPEN', 'CLOSED']).optional(),
      milestoneId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const num = parseInt(req.params.number);

    const current = await prisma.issue.findUnique({
      where: { repoId_number: { repoId: repo.id, number: num } },
    });
    if (!current) throw createError('Issue not found', 404);

    const updateData: any = { ...data };
    if (data.state === 'CLOSED' && current.state === 'OPEN') {
      updateData.closedAt = new Date();
      await prisma.repository.update({ where: { id: repo.id }, data: { openIssuesCount: { decrement: 1 } } });
    } else if (data.state === 'OPEN' && current.state === 'CLOSED') {
      updateData.closedAt = null;
      await prisma.repository.update({ where: { id: repo.id }, data: { openIssuesCount: { increment: 1 } } });
    }

    const updated = await prisma.issue.update({
      where: { id: current.id },
      data: updateData,
      select: issueSelect,
    });
    res.json({ success: true, data: formatIssue(updated) });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

// GET /api/issues/:owner/:repo/:number/comments
router.get('/:owner/:repo/:number/comments', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user?.id);
    const issue = await prisma.issue.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!issue) throw createError('Issue not found', 404);

    const comments = await prisma.comment.findMany({
      where: { issueId: issue.id },
      include: { author: { select: { id: true, username: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: comments });
  } catch (err) { next(err); }
});

// POST /api/issues/:owner/:repo/:number/comments
router.post('/:owner/:repo/:number/comments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user!.id);
    const issue = await prisma.issue.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!issue) throw createError('Issue not found', 404);

    const { body } = req.body;
    if (!body?.trim()) throw createError('Comment body required', 400);

    const comment = await prisma.comment.create({
      data: { issueId: issue.id, authorId: req.user!.id, body },
      include: { author: { select: { id: true, username: true, name: true, avatarUrl: true } } },
    });
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

// GET /api/issues/:owner/:repo/labels
router.get('/:owner/:repo/labels', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user?.id);
    const labels = await prisma.label.findMany({ where: { repoId: repo.id } });
    res.json({ success: true, data: labels });
  } catch (err) { next(err); }
});

// POST /api/issues/:owner/:repo/labels
router.post('/:owner/:repo/labels', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepoByOwnerName(req.params.owner, req.params.repo, req.user!.id);
    const { name, color, description } = req.body;
    if (!name) throw createError('Label name required', 400);
    const label = await prisma.label.create({
      data: { repoId: repo.id, name, color: color || '#0075ca', description },
    });
    res.status(201).json({ success: true, data: label });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────
// Format helper
// ─────────────────────────────────────────────────────────
function formatIssue(issue: any) {
  return {
    ...issue,
    labels: issue.labels?.map((il: any) => il.label) || [],
    assignees: issue.assignees?.map((ia: any) => ia.user) || [],
    commentsCount: issue._count?.comments || 0,
    _count: undefined,
  };
}

export default router;
