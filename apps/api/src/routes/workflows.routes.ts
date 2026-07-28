import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import * as workflowService from '../services/workflow.service';

const router = Router();

async function getRepoWithAccess(owner: string, repo: string, userId?: string) {
  const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
  if (!ownerUser) throw createError('User not found', 404);

  const repository = await prisma.repository.findFirst({
    where: { ownerId: ownerUser.id, name: repo },
    include: { owner: { select: { username: true } } },
  });
  if (!repository) throw createError('Repository not found', 404);
  if (repository.isPrivate && repository.ownerId !== userId) {
    throw createError('Forbidden', 403);
  }
  return repository;
}

// GET /api/workflows/:owner/:repo — List workflows
router.get('/:owner/:repo', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repository = await getRepoWithAccess(owner, repo, req.user!.id);

    await workflowService.syncWorkflowsFromRepo(repository.id, owner, repo);

    const workflows = await prisma.workflow.findMany({
      where: { repoId: repository.id },
      include: {
        runs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, createdAt: true, runNumber: true },
        },
        _count: { select: { runs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: workflows });
  } catch (err) { next(err); }
});

// GET /api/workflows/:owner/:repo/runs — List workflow runs
router.get('/:owner/:repo/runs', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const repository = await getRepoWithAccess(owner, repo, req.user!.id);
    const result = await workflowService.getWorkflowRuns(repository.id, page, limit);
    res.json({ success: true, data: result.runs, pagination: { page, limit, total: result.total } });
  } catch (err) { next(err); }
});

// GET /api/workflows/:owner/:repo/runs/:runId — Get run details
router.get('/:owner/:repo/runs/:runId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, runId } = req.params;
    const repository = await getRepoWithAccess(owner, repo, req.user!.id);
    const run = await workflowService.getWorkflowRun(runId);
    if (!run || run.repoId !== repository.id) throw createError('Run not found', 404);
    res.json({ success: true, data: run });
  } catch (err) { next(err); }
});

// POST /api/workflows/:owner/:repo — Create workflow
router.post('/:owner/:repo', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repository = await getRepoWithAccess(owner, repo, req.user!.id);
    if (repository.ownerId !== req.user!.id) throw createError('Forbidden', 403);

    const schema = z.object({
      name: z.string().min(1),
      filename: z.string().min(1).regex(/\.ya?ml$/),
      content: z.string().min(1),
    });
    const data = schema.parse(req.body);

    let triggers: string[] = ['push'];
    try {
      const parsed = workflowService.parseSimpleYaml(data.content);
      triggers = Object.keys(Array.isArray(parsed.on) ? {} : (parsed.on || {}));
      if (Array.isArray(parsed.on)) triggers = parsed.on;
    } catch { /* use default */ }

    const workflow = await prisma.workflow.upsert({
      where: { repoId_filename: { repoId: repository.id, filename: data.filename } },
      update: { name: data.name, content: data.content, triggers },
      create: { repoId: repository.id, name: data.name, filename: data.filename, content: data.content, triggers },
    });

    res.json({ success: true, data: workflow });
  } catch (err: unknown) {
    const e = err as { name?: string; errors?: Array<{ message: string }> };
    if (e.name === 'ZodError') return res.status(400).json({ success: false, error: e.errors?.[0]?.message });
    next(err);
  }
});

// POST /api/workflows/:owner/:repo/sync — Sync from repo files
router.post('/:owner/:repo/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repository = await getRepoWithAccess(owner, repo, req.user!.id);
    const count = await workflowService.syncWorkflowsFromRepo(repository.id, owner, repo);
    res.json({ success: true, data: { synced: count } });
  } catch (err) { next(err); }
});

// POST /api/workflows/:owner/:repo/:workflowId/run — Manual trigger
router.post('/:owner/:repo/:workflowId/run', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, workflowId } = req.params;
    const { branch = 'main' } = req.body;
    const repository = await getRepoWithAccess(owner, repo, req.user!.id);
    if (repository.ownerId !== req.user!.id) throw createError('Forbidden', 403);

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, repoId: repository.id },
    });
    if (!workflow) throw createError('Workflow not found', 404);

    const runId = await workflowService.triggerWorkflowManually(workflowId, repository.id, branch);
    res.json({ success: true, data: { runId } });
  } catch (err) { next(err); }
});

// DELETE /api/workflows/:owner/:repo/:workflowId
router.delete('/:owner/:repo/:workflowId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, workflowId } = req.params;
    const repository = await getRepoWithAccess(owner, repo, req.user!.id);
    if (repository.ownerId !== req.user!.id) throw createError('Forbidden', 403);

    await prisma.workflow.deleteMany({ where: { id: workflowId, repoId: repository.id } });
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err) { next(err); }
});

export default router;
