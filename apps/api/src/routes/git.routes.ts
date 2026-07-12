import { Router } from 'express';
import prisma from '../lib/prisma';
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth.middleware';
import * as gitService from '../services/git.service';
import { createError } from '../middleware/error.middleware';

const router = Router();

// GET /api/git/:owner/:repo/contents — file tree or single file
router.get('/:owner/:repo/contents', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const ref = (req.query.ref as string) || 'HEAD';
    const path = (req.query.path as string) || '';

    const tree = await gitService.getTree(owner, repo, ref, path);
    if (tree === null) throw createError('Repository or path not found', 404);

    res.json({ success: true, data: tree });
  } catch (err) { next(err); }
});

// GET /api/git/:owner/:repo/blob — file content
router.get('/:owner/:repo/blob', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const ref = (req.query.ref as string) || 'HEAD';
    const path = req.query.path as string;
    if (!path) throw createError('File path required', 400);

    const blob = await gitService.getBlob(owner, repo, ref, path);
    if (!blob) throw createError('File not found', 404);

    res.json({ success: true, data: blob });
  } catch (err) { next(err); }
});

// GET /api/git/:owner/:repo/commits
router.get('/:owner/:repo/commits', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const ref = (req.query.ref as string) || 'HEAD';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const path = req.query.path as string | undefined;

    const commits = await gitService.getCommits(owner, repo, ref, { page, limit, path });
    res.json({ success: true, data: commits });
  } catch (err) { next(err); }
});

// GET /api/git/:owner/:repo/commit/:sha
router.get('/:owner/:repo/commit/:sha', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, sha } = req.params;
    const commit = await gitService.getCommit(owner, repo, sha);
    if (!commit) throw createError('Commit not found', 404);
    res.json({ success: true, data: commit });
  } catch (err) { next(err); }
});

// GET /api/git/:owner/:repo/compare/:base...:head
router.get('/:owner/:repo/compare/:baseHead', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, baseHead } = req.params;
    const [base, head] = baseHead.includes('...') ? baseHead.split('...') : baseHead.split('..');
    if (!base || !head) throw createError('Invalid comparison format. Use base...head', 400);

    const result = await gitService.compareBranches(owner, repo, base, head);
    if (!result) throw createError('Could not compare branches', 404);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/git/:owner/:repo/raw — raw file download
router.get('/:owner/:repo/raw', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const ref = (req.query.ref as string) || 'HEAD';
    const path = req.query.path as string;
    if (!path) throw createError('File path required', 400);

    const blob = await gitService.getBlob(owner, repo, ref, path);
    if (!blob) throw createError('File not found', 404);

    const content = blob.encoding === 'base64'
      ? Buffer.from(blob.content, 'base64')
      : Buffer.from(blob.content, 'utf8');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${path.split('/').pop()}"`);
    res.send(content);
  } catch (err) { next(err); }
});

export default router;
