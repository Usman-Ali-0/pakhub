import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { PullRequestState } from '@prisma/client';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import * as gitService from '../services/git.service';
import * as aiService from '../services/ai.service';

const router = Router();

const prSelect = {
  id: true, repoId: true, number: true, title: true, body: true,
  state: true, authorId: true, headBranch: true, baseBranch: true,
  headSha: true, baseSha: true, isDraft: true,
  mergedAt: true, closedAt: true, createdAt: true, updatedAt: true,
  author: { select: { id: true, username: true, name: true, avatarUrl: true } },
  labels: { include: { label: true } },
  _count: { select: { comments: true, reviews: true } },
};

async function getRepo(owner: string, repo: string, userId?: string) {
  const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
  if (!ownerUser) throw createError('User not found', 404);
  const repository = await prisma.repository.findFirst({
    where: { ownerId: ownerUser.id, name: repo },
  });
  if (!repository) throw createError('Repository not found', 404);
  if (repository.isPrivate && userId !== ownerUser.id) throw createError('Not found', 404);
  return repository;
}

// GET /api/pulls/:owner/:repo
router.get('/:owner/:repo', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user?.id);
    const state = ((req.query.state as string) || 'OPEN') as PullRequestState;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);

    const [prs, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where: { repoId: repo.id, state },
        select: prSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pullRequest.count({ where: { repoId: repo.id, state } }),
    ]);

    res.json({
      success: true,
      data: prs.map(formatPR),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// GET /api/pulls/:owner/:repo/:number
router.get('/:owner/:repo/:number', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user?.id);
    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
      select: {
        ...prSelect,
        reviews: {
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            comments: { include: { author: { select: { id: true, username: true, avatarUrl: true } } } },
          },
        },
      },
    });
    if (!pr) throw createError('Pull request not found', 404);

    // Get diff from git
    const diff = await gitService.compareBranches(
      req.params.owner, req.params.repo, pr.baseBranch, pr.headBranch
    );

    res.json({ success: true, data: { ...formatPR(pr), diff } });
  } catch (err) { next(err); }
});

// POST /api/pulls/:owner/:repo — Create PR
router.post('/:owner/:repo', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user!.id);
    const schema = z.object({
      title: z.string().min(1).max(500),
      body: z.string().max(65536).optional(),
      headBranch: z.string(),
      baseBranch: z.string().default('main'),
      isDraft: z.boolean().default(false),
      labelIds: z.array(z.string()).optional(),
    });
    const data = schema.parse(req.body);

    const lastPR = await prisma.pullRequest.findFirst({
      where: { repoId: repo.id },
      orderBy: { number: 'desc' },
    });
    const number = (lastPR?.number || 0) + 1;

    const pr = await prisma.pullRequest.create({
      data: {
        repoId: repo.id,
        number,
        title: data.title,
        body: data.body,
        headBranch: data.headBranch,
        baseBranch: data.baseBranch,
        headSha: 'pending',
        baseSha: 'pending',
        isDraft: data.isDraft,
        authorId: req.user!.id,
        labels: data.labelIds ? { create: data.labelIds.map(id => ({ labelId: id })) } : undefined,
      },
      select: prSelect,
    });

    // Trigger AI review in background (don't await)
    triggerAIReview(req.params.owner, req.params.repo, pr.id, data.headBranch, data.baseBranch, data.title, data.body || '', req.user!.id).catch(console.error);

    res.status(201).json({ success: true, data: formatPR(pr) });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

// PATCH /api/pulls/:owner/:repo/:number — Update PR
router.patch('/:owner/:repo/:number', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user!.id);
    const schema = z.object({
      title: z.string().min(1).max(500).optional(),
      body: z.string().max(65536).optional(),
      state: z.enum(['OPEN', 'CLOSED']).optional(),
      isDraft: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const num = parseInt(req.params.number);

    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: num } },
    });
    if (!pr) throw createError('Pull request not found', 404);

    const updateData: any = { ...data };
    if (data.state === 'CLOSED') updateData.closedAt = new Date();

    const updated = await prisma.pullRequest.update({
      where: { id: pr.id },
      data: updateData,
      select: prSelect,
    });
    res.json({ success: true, data: formatPR(updated) });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

// POST /api/pulls/:owner/:repo/:number/merge
router.post('/:owner/:repo/:number/merge', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user!.id);
    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!pr) throw createError('Pull request not found', 404);
    if (pr.state !== 'OPEN') throw createError('Pull request is not open', 400);

    // Update PR to merged
    await prisma.pullRequest.update({
      where: { id: pr.id },
      data: { state: 'MERGED', mergedAt: new Date() },
    });

    res.json({ success: true, message: 'Pull request merged successfully' });
  } catch (err) { next(err); }
});

// GET /api/pulls/:owner/:repo/:number/comments
router.get('/:owner/:repo/:number/comments', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user?.id);
    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!pr) throw createError('PR not found', 404);

    const comments = await prisma.comment.findMany({
      where: { pullRequestId: pr.id },
      include: { author: { select: { id: true, username: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: comments });
  } catch (err) { next(err); }
});

// POST /api/pulls/:owner/:repo/:number/comments
router.post('/:owner/:repo/:number/comments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user!.id);
    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!pr) throw createError('PR not found', 404);

    const { body } = req.body;
    if (!body?.trim()) throw createError('Comment body required', 400);

    const comment = await prisma.comment.create({
      data: { pullRequestId: pr.id, authorId: req.user!.id, body },
      include: { author: { select: { id: true, username: true, name: true, avatarUrl: true } } },
    });
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

// POST /api/pulls/:owner/:repo/:number/reviews — Submit review
router.post('/:owner/:repo/:number/reviews', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user!.id);
    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!pr) throw createError('PR not found', 404);

    const schema = z.object({
      state: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED']),
      body: z.string().max(65536).optional(),
      comments: z.array(z.object({
        path: z.string(),
        line: z.number(),
        body: z.string(),
      })).optional(),
    });
    const data = schema.parse(req.body);

    const review = await prisma.review.create({
      data: {
        pullRequestId: pr.id,
        authorId: req.user!.id,
        state: data.state,
        body: data.body,
        comments: data.comments
          ? { create: data.comments.map(c => ({ ...c, pullRequestId: pr.id, authorId: req.user!.id })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        comments: true,
      },
    });
    res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

// POST /api/pulls/:owner/:repo/:number/ai-review — Trigger AI review manually
router.post('/:owner/:repo/:number/ai-review', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user!.id);
    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!pr) throw createError('PR not found', 404);

    const diff = await gitService.compareBranches(req.params.owner, req.params.repo, pr.baseBranch, pr.headBranch);
    const diffText = diff?.commits?.map((c: any) => c.message).join('\n') || '';

    const review = await aiService.reviewPullRequest(diffText, pr.title, pr.body || '', req.user!.id);
    res.json({ success: true, data: review });
  } catch (err) { next(err); }
});

// POST /api/pulls/:owner/:repo/:number/ai-summary
router.post('/:owner/:repo/:number/ai-summary', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const repo = await getRepo(req.params.owner, req.params.repo, req.user!.id);
    const pr = await prisma.pullRequest.findUnique({
      where: { repoId_number: { repoId: repo.id, number: parseInt(req.params.number) } },
    });
    if (!pr) throw createError('PR not found', 404);

    const diff = await gitService.compareBranches(req.params.owner, req.params.repo, pr.baseBranch, pr.headBranch);
    const diffText = JSON.stringify(diff || '');
    const summary = await aiService.summarizePullRequest(diffText, pr.headBranch, pr.baseBranch, req.user!.id);
    res.json({ success: true, data: { summary } });
  } catch (err) { next(err); }
});

async function triggerAIReview(owner: string, repo: string, prId: string, head: string, base: string, title: string, body: string, userId: string) {
  const diff = await gitService.compareBranches(owner, repo, base, head);
  if (!diff) return;
  const diffText = JSON.stringify(diff);
  await aiService.reviewPullRequest(diffText, title, body, userId);
}

function formatPR(pr: any) {
  return {
    ...pr,
    labels: pr.labels?.map((pl: any) => pl.label) || [],
    commentsCount: pr._count?.comments || 0,
    reviewsCount: pr._count?.reviews || 0,
    _count: undefined,
  };
}

export default router;
