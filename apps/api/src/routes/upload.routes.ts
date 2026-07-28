import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import * as gitService from '../services/git.service';
import { triggerWorkflowsOnPush } from '../services/workflow.service';
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
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

// POST /api/upload/file/:owner/:repo
// Upload a single file directly to a repo path
router.post('/file/:owner/:repo', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  const workDir = path.join(uploadsDir, `work-${uuidv4()}`);
  const uploadedFilePath = req.file?.path;
  try {
    const { owner, repo } = req.params;
    const { branch = 'main', commitMessage, filePath: targetPath = '' } = req.body;

    if (!req.file) throw createError('No file uploaded', 400);

    // Verify ownership/access
    const ownerUser = await prisma.user.findUnique({ where: { username: owner as string } });
    if (!ownerUser) throw createError('User not found', 404);
    if (ownerUser.id !== req.user!.id) throw createError('Forbidden', 403);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: repo as string },
    });
    if (!repository) throw createError('Repository not found', 404);

    const repoPath = gitService.getRepoPath(owner as string, repo as string);

    fs.mkdirSync(workDir, { recursive: true });

    // Clone the bare repo to workDir
    await execPromise(`git clone "${repoPath}" "${workDir}"`);

    const cwdOpt = { cwd: workDir };
    // Checkout or create the target branch
    try {
      await execPromise(`git checkout "${branch}"`, cwdOpt);
    } catch {
      try {
        await execPromise(`git checkout -b "${branch}" "origin/${branch}"`, cwdOpt);
      } catch {
        await execPromise(`git checkout -b "${branch}"`, cwdOpt).catch(() => {});
      }
    }

    // Determine destination path inside repo
    const originalName = req.file.originalname;
    const destRelative = targetPath ? path.join(targetPath, originalName) : originalName;
    const destAbsolute = path.join(workDir, destRelative);

    // Ensure subdirectory exists
    fs.mkdirSync(path.dirname(destAbsolute), { recursive: true });
    fs.copyFileSync(req.file.path, destAbsolute);

    // Git add, commit, push
    await execPromise(`git config user.name "${req.user!.username}"`, cwdOpt);
    await execPromise(`git config user.email "${req.user!.email}"`, cwdOpt);
    await execPromise(`git add -A`, cwdOpt);
    
    const message = commitMessage || `Upload ${originalName}`;
    await execPromise(`git commit -m "${message}"`, cwdOpt).catch(() => {
      // nothing to commit
    });
    await execPromise(`git push origin HEAD:"${branch}" --force-with-lease`, cwdOpt).catch(async () => {
      await execPromise(`git push origin HEAD:"${branch}"`, cwdOpt);
    });

    const headSha = await execPromise(`git -C "${repoPath}" rev-parse refs/heads/${branch}`).then(r => r.stdout.trim()).catch(() => undefined);
    triggerWorkflowsOnPush(repository.id, owner as string, repo as string, branch, headSha, message).catch(console.error);

    res.json({ success: true, message: 'File uploaded successfully' });
  } catch (err) { next(err); }
  finally {
    if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
  }
});

// POST /api/upload/repo/:owner/:repo
// Allows uploading a zip file that will be extracted and committed to the repo
router.post('/repo/:owner/:repo', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  const workDir = path.join(uploadsDir, `work-${uuidv4()}`);
  const uploadedFilePath = req.file?.path;
  try {
    const { owner, repo } = req.params;
    const { branch = 'main', commitMessage = 'Upload files' } = req.body;
    
    if (!req.file) throw createError('No file uploaded', 400);

    // Verify ownership/access
    const ownerUser = await prisma.user.findUnique({ where: { username: owner as string } });
    if (!ownerUser) throw createError('User not found', 404);
    if (ownerUser.id !== req.user!.id) throw createError('Forbidden', 403);

    const repository = await prisma.repository.findFirst({
      where: { ownerId: req.user!.id, name: repo as string },
    });
    if (!repository) throw createError('Repository not found', 404);

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    
    const repoPath = gitService.getRepoPath(owner as string, repo as string);
    
    fs.mkdirSync(workDir, { recursive: true });

    // Clone the bare repo to workDir
    await execPromise(`git clone "${repoPath}" "${workDir}"`);

    const cwdOpt = { cwd: workDir };
    // Checkout the target branch
    try {
      await execPromise(`git checkout "${branch}"`, cwdOpt);
    } catch {
      try {
        await execPromise(`git checkout -b "${branch}" "origin/${branch}"`, cwdOpt);
      } catch {
        await execPromise(`git checkout -b "${branch}"`, cwdOpt).catch(() => {});
      }
    }

    // If it's a zip file, extract it
    if (ext === '.zip') {
      // Extract zip into a temp folder to avoid nested directory issues
      const extractDir = path.join(workDir, `__extract__${uuidv4()}`);
      fs.mkdirSync(extractDir, { recursive: true });
      
      await execPromise(`tar -xf "${filePath}" -C "${extractDir}"`).catch(async () => {
        // Fallback: try unzip if tar fails on this zip
        await execPromise(`unzip -o "${filePath}" -d "${extractDir}"`);
      });

      // Check if zip contained a single top-level folder (common pattern like repo-main/)
      // If so, flatten it so we don't get a nested folder in the repo
      const extractedItems = fs.readdirSync(extractDir);
      if (extractedItems.length === 1) {
        const singleItem = path.join(extractDir, extractedItems[0]);
        if (fs.statSync(singleItem).isDirectory()) {
          // Move contents of the single folder directly into workDir
          const innerItems = fs.readdirSync(singleItem);
          for (const item of innerItems) {
            const src = path.join(singleItem, item);
            const dest = path.join(workDir, item);
            if (fs.existsSync(dest)) {
              fs.rmSync(dest, { recursive: true, force: true });
            }
            fs.renameSync(src, dest);
          }
        } else {
          // Single file — move it to workDir
          fs.renameSync(singleItem, path.join(workDir, extractedItems[0]));
        }
      } else {
        // Multiple items — move all to workDir
        for (const item of extractedItems) {
          const src = path.join(extractDir, item);
          const dest = path.join(workDir, item);
          if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: true, force: true });
          }
          fs.renameSync(src, dest);
        }
      }
      // Clean up extract dir
      fs.rmSync(extractDir, { recursive: true, force: true });
    } else {
      // Single file: copy with its original name
      fs.copyFileSync(filePath, path.join(workDir, req.file.originalname));
    }

    // Git add, commit, push
    await execPromise(`git config user.name "${req.user!.username}"`, cwdOpt);
    await execPromise(`git config user.email "${req.user!.email}"`, cwdOpt);
    await execPromise(`git add -A`, cwdOpt);
    await execPromise(`git commit -m "${commitMessage}"`, cwdOpt).catch(() => {
      // Might fail if nothing to commit — that's fine
    });
    // Use force-with-lease to avoid non-fast-forward errors while staying safe
    await execPromise(`git push origin HEAD:"${branch}" --force-with-lease`, cwdOpt).catch(async () => {
      await execPromise(`git push origin HEAD:"${branch}"`, cwdOpt);
    });

    if (branch === repository.defaultBranch) {
      await execPromise(`git -C "${repoPath}" symbolic-ref HEAD refs/heads/${branch}`).catch(() => {});
    }

    // Trigger CI/CD workflows on push
    const headSha = await execPromise(`git -C "${repoPath}" rev-parse refs/heads/${branch}`).then(r => r.stdout.trim()).catch(() => undefined);
    triggerWorkflowsOnPush(repository.id, owner as string, repo as string, branch, headSha, commitMessage).catch(console.error);

    res.json({ success: true, message: 'Files uploaded successfully' });
  } catch (err) { next(err); }
  finally {
    if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
  }
});

export default router;
