import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

function detectLanguage(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'JavaScript', ts: 'TypeScript', py: 'Python', rb: 'Ruby',
    java: 'Java', go: 'Go', rs: 'Rust', cpp: 'C++', c: 'C',
    cs: 'C#', php: 'PHP', swift: 'Swift', kt: 'Kotlin',
    html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON',
    yaml: 'YAML', yml: 'YAML', md: 'Markdown', sql: 'SQL',
    sh: 'Shell', bash: 'Shell', dockerfile: 'Dockerfile',
    xml: 'XML', toml: 'TOML', lua: 'Lua', r: 'R',
  };
  return ext ? langMap[ext] || null : null;
}

const createGistSchema = z.object({
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  files: z.array(z.object({
    filename: z.string().min(1),
    content: z.string()
  })).min(1, "At least one file is required")
});

const updateGistSchema = z.object({
  description: z.string().optional(),
  files: z.array(z.object({
    filename: z.string().min(1),
    content: z.string()
  })).optional()
});

// 1. POST / - Create gist
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { description, isPublic, files } = createGistSchema.parse(req.body);
    const gistFiles = files.map((f: any) => ({
      filename: f.filename, content: f.content,
      language: detectLanguage(f.filename),
      size: Buffer.byteLength(f.content, 'utf8')
    }));
    const gist = await prisma.gist.create({
      data: { authorId: req.user!.id, description, isPublic, files: { create: gistFiles } },
      include: { files: true, author: { select: { id: true, username: true, avatarUrl: true } } }
    });
    res.status(201).json({ success: true, data: gist });
  } catch (error) { next(error); }
});

// 2. GET / - List public gists
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const [gists, total] = await Promise.all([
      prisma.gist.findMany({
        where: { isPublic: true }, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          files: { select: { id: true, filename: true, language: true, size: true } }
        }
      }),
      prisma.gist.count({ where: { isPublic: true } })
    ]);
    res.json({ success: true, data: { gists, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
});

// 3. GET /user - Current user's gists
router.get('/user', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const gists = await prisma.gist.findMany({
      where: { authorId: req.user!.id }, orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        files: { select: { id: true, filename: true, language: true, size: true } }
      }
    });
    res.json({ success: true, data: gists });
  } catch (error) { next(error); }
});

// 4. GET /user/:username - User's public gists
router.get('/user/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw createError('User not found', 404);
    const gists = await prisma.gist.findMany({
      where: { authorId: user.id, isPublic: true }, orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        files: { select: { id: true, filename: true, language: true, size: true } }
      }
    });
    res.json({ success: true, data: gists });
  } catch (error) { next(error); }
});

// 11. GET /starred - Starred gists
router.get('/starred', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stars = await prisma.gistStar.findMany({
      where: { userId: req.user!.id },
      include: { gist: { include: { author: { select: { id: true, username: true, avatarUrl: true } }, files: { select: { id: true, filename: true, language: true, size: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    const gists = stars.map((s: any) => s.gist);
    res.json({ success: true, data: gists });
  } catch (error) { next(error); }
});

// 5. GET /:id - Single gist
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const gist = await prisma.gist.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { id: true, username: true, avatarUrl: true } }, files: true, _count: { select: { stars: true, forks: true } } }
    });
    if (!gist) throw createError('Gist not found', 404);
    if (!gist.isPublic && (!req.user || req.user.id !== gist.authorId)) throw createError('Forbidden', 403);
    let isStarred = false;
    if (req.user) {
      const star = await prisma.gistStar.findFirst({ where: { gistId: gist.id, userId: req.user.id } });
      isStarred = !!star;
    }
    res.json({ success: true, data: { ...gist, isStarred } });
  } catch (error) { next(error); }
});

// 6. PATCH /:id - Update gist
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { description, files } = updateGistSchema.parse(req.body);
    const gist = await prisma.gist.findUnique({ where: { id: req.params.id } });
    if (!gist) throw createError('Gist not found', 404);
    if (gist.authorId !== req.user!.id) throw createError('Not authorized', 403);
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (files) {
      const gistFiles = files.map((f: any) => ({ filename: f.filename, content: f.content, language: detectLanguage(f.filename), size: Buffer.byteLength(f.content, 'utf8') }));
      await prisma.$transaction([
        prisma.gistFile.deleteMany({ where: { gistId: gist.id } }),
        prisma.gist.update({ where: { id: gist.id }, data: { ...updateData, files: { create: gistFiles } } })
      ]);
    } else if (Object.keys(updateData).length > 0) {
      await prisma.gist.update({ where: { id: gist.id }, data: updateData });
    }
    const updatedGist = await prisma.gist.findUnique({ where: { id: gist.id }, include: { files: true, author: { select: { id: true, username: true, avatarUrl: true } } } });
    res.json({ success: true, data: updatedGist });
  } catch (error) { next(error); }
});

// 7. DELETE /:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const gist = await prisma.gist.findUnique({ where: { id: req.params.id } });
    if (!gist) throw createError('Gist not found', 404);
    if (gist.authorId !== req.user!.id) throw createError('Not authorized', 403);
    await prisma.gist.delete({ where: { id: gist.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

// 8. POST /:id/star - Toggle star
router.post('/:id/star', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const gist = await prisma.gist.findUnique({ where: { id: req.params.id } });
    if (!gist) throw createError('Gist not found', 404);
    if (!gist.isPublic && gist.authorId !== req.user!.id) throw createError('Forbidden', 403);
    const existing = await prisma.gistStar.findFirst({ where: { gistId: gist.id, userId: req.user!.id } });
    if (existing) {
      await prisma.gistStar.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { starred: false } });
    } else {
      await prisma.gistStar.create({ data: { gistId: gist.id, userId: req.user!.id } });
      res.json({ success: true, data: { starred: true } });
    }
  } catch (error) { next(error); }
});

// 9. POST /:id/fork
router.post('/:id/fork', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const gist = await prisma.gist.findUnique({ where: { id: req.params.id }, include: { files: true } });
    if (!gist) throw createError('Gist not found', 404);
    if (!gist.isPublic && gist.authorId !== req.user!.id) throw createError('Forbidden', 403);
    const forkedFiles = gist.files.map((f: any) => ({ filename: f.filename, content: f.content, language: f.language, size: f.size }));
    const newGist = await prisma.gist.create({
      data: { authorId: req.user!.id, description: gist.description, isPublic: true, files: { create: forkedFiles } },
      include: { files: true, author: { select: { id: true, username: true, avatarUrl: true } } }
    });
    await prisma.gistFork.create({ data: { gistId: gist.id, userId: req.user!.id, forkedGistId: newGist.id } });
    res.status(201).json({ success: true, data: newGist });
  } catch (error) { next(error); }
});

// 10. GET /:id/forks
router.get('/:id/forks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gist = await prisma.gist.findUnique({ where: { id: req.params.id } });
    if (!gist) throw createError('Gist not found', 404);
    const forks = await prisma.gistFork.findMany({ where: { gistId: gist.id }, orderBy: { createdAt: 'desc' } });
    const forkedGistIds = forks.map((f: any) => f.forkedGistId);
    const forkedGists = await prisma.gist.findMany({
      where: { id: { in: forkedGistIds } },
      include: { author: { select: { id: true, username: true, avatarUrl: true } }, files: { select: { id: true, filename: true, language: true, size: true } } }
    });
    res.json({ success: true, data: forkedGists });
  } catch (error) { next(error); }
});

export default router;
