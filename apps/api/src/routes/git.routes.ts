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

// PUT /api/git/:owner/:repo/contents — Create or update a file (in-browser editor)
router.put('/:owner/:repo/contents', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { path: filePath, content, message, branch = 'main' } = req.body;

    if (!filePath || content === undefined) throw createError('path and content are required', 400);
    if (!message) throw createError('Commit message is required', 400);

    // Verify ownership
    const ownerUser = await prisma.user.findUnique({ where: { username: owner as string } });
    if (!ownerUser || ownerUser.id !== req.user!.id) throw createError('Forbidden', 403);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: repo as string },
    });
    if (!repository) throw createError('Repository not found', 404);

    const repoPath = gitService.getRepoPath(owner, repo);
    const { execSync } = require('child_process');
    const fs = require('fs');
    const pathModule = require('path');
    const os = require('os');

    // Clone to temp dir, make changes, push
    const tmpDir = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'pakhub-edit-'));
    try {
      execSync(`git clone "${repoPath}" "${tmpDir}"`, { stdio: 'pipe' });

      // Checkout branch
      try {
        execSync(`git checkout "${branch}"`, { cwd: tmpDir, stdio: 'pipe' });
      } catch {
        execSync(`git checkout -b "${branch}"`, { cwd: tmpDir, stdio: 'pipe' });
      }

      // Write file
      const fullPath = pathModule.join(tmpDir, filePath);
      fs.mkdirSync(pathModule.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf8');

      // Commit and push
      execSync(`git add "${filePath}"`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git config user.email "${req.user!.email || 'user@pakhub.com'}"`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git config user.name "${req.user!.username}"`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git push origin "${branch}" --force-with-lease`, { cwd: tmpDir, stdio: 'pipe' });

      res.json({ success: true, message: 'File saved successfully' });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) { next(err); }
});

// DELETE /api/git/:owner/:repo/contents — Delete a file
router.delete('/:owner/:repo/contents', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { path: filePath, message, branch = 'main' } = req.body;

    if (!filePath) throw createError('path is required', 400);
    if (!message) throw createError('Commit message is required', 400);

    const ownerUser = await prisma.user.findUnique({ where: { username: owner as string } });
    if (!ownerUser || ownerUser.id !== req.user!.id) throw createError('Forbidden', 403);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: repo as string },
    });
    if (!repository) throw createError('Repository not found', 404);

    const repoPath = gitService.getRepoPath(owner, repo);
    const { execSync } = require('child_process');
    const fs = require('fs');
    const pathModule = require('path');
    const os = require('os');

    const tmpDir = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'pakhub-del-'));
    try {
      execSync(`git clone "${repoPath}" "${tmpDir}"`, { stdio: 'pipe' });
      try {
        execSync(`git checkout "${branch}"`, { cwd: tmpDir, stdio: 'pipe' });
      } catch {
        throw createError('Branch not found', 404);
      }

      const fullPath = pathModule.join(tmpDir, filePath);
      if (!fs.existsSync(fullPath)) throw createError('File not found', 404);

      fs.unlinkSync(fullPath);
      execSync(`git add -A`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git config user.email "${req.user!.email || 'user@pakhub.com'}"`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git config user.name "${req.user!.username}"`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: tmpDir, stdio: 'pipe' });
      execSync(`git push origin "${branch}" --force-with-lease`, { cwd: tmpDir, stdio: 'pipe' });

      res.json({ success: true, message: 'File deleted successfully' });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) { next(err); }
});

export default router;

