import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import * as gitService from '../services/git.service';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const router = Router();

// Ensure uploads dir exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// POST /api/upload/avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw createError('No file uploaded', 400);

    const avatarUrl = `/uploads/${req.file.filename}`;
    
    // Update user profile
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl },
      select: {
        id: true, username: true, email: true, name: true,
        bio: true, avatarUrl: true, website: true, location: true,
        twitterHandle: true, updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// POST /api/upload/repo/:owner/:repo
// Allows uploading a zip file that will be extracted and committed to the repo
router.post('/repo/:owner/:repo', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { branch = 'main', commitMessage = 'Upload files' } = req.body;
    
    if (!req.file) throw createError('No file uploaded', 400);

    // Verify ownership/access
    const ownerUser = await prisma.user.findUnique({ where: { username: owner } });
    if (!ownerUser) throw createError('User not found', 404);
    if (ownerUser.id !== req.user!.id) throw createError('Forbidden', 403);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: repo },
    });
    if (!repository) throw createError('Repository not found', 404);

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    
    // Temporary working directory for git operations
    const workDir = path.join(uploadsDir, `work-${uuidv4()}`);
    fs.mkdirSync(workDir, { recursive: true });

    try {
      const repoPath = gitService.getRepoPath(owner, repo);
      
      // Clone the bare repo to workDir
      await execPromise(`git clone "${repoPath}" "${workDir}"`);

      // Checkout the target branch so we commit on top of it (avoiding non-fast-forward errors)
      const cwdOpt = { cwd: workDir };
      try {
        await execPromise(`git checkout ${branch}`, cwdOpt);
      } catch {
        try {
          await execPromise(`git checkout -b ${branch} origin/${branch}`, cwdOpt);
        } catch {
          try {
            await execPromise(`git checkout -b ${branch}`, cwdOpt);
          } catch {}
        }
      }

      // If it's a zip file, extract it
      if (ext === '.zip') {
        // Use native tar for fast, reliable extraction on Windows/Linux
        await execPromise(`tar -xf "${filePath}" -C "${workDir}"`);
      } else {
        // Just copy the single file
        fs.copyFileSync(filePath, path.join(workDir, req.file.originalname));
      }

      // Git add, commit, push
      await execPromise(`git config user.name "${req.user!.username}"`, { cwd: workDir });
      await execPromise(`git config user.email "${req.user!.email}"`, { cwd: workDir });
      await execPromise(`git add .`, { cwd: workDir });
      await execPromise(`git commit -m "${commitMessage}"`, { cwd: workDir }).catch(() => {
        // Might fail if nothing to commit
      });
      await execPromise(`git push origin HEAD:${branch}`, { cwd: workDir });

      if (branch === repository.defaultBranch) {
        await execPromise(`git -C "${repoPath}" symbolic-ref HEAD refs/heads/${branch}`);
      }

      res.json({ success: true, message: 'Files uploaded successfully' });
    } finally {
      // Cleanup
      fs.rmSync(workDir, { recursive: true, force: true });
      fs.unlinkSync(filePath); // remove the uploaded zip/file
    }
  } catch (err) { next(err); }
});

export default router;
