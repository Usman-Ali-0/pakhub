import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

const createWikiSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

const updateWikiSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1, 'Content is required'),
  message: z.string().optional(),
});

async function getRepository(owner: string, repo: string) {
  return await prisma.repository.findFirst({
    where: { name: repo, owner: { username: owner } },
  });
}

// 1. GET /:owner/:repo - List all wiki pages
router.get('/:owner/:repo', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const repository = await getRepository(owner, repo);
    if (!repository) throw createError('Repository not found', 404);

    const pages = await prisma.wikiPage.findMany({
      where: { repoId: repository.id },
      select: { id: true, title: true, slug: true, authorId: true, createdAt: true, updatedAt: true },
      orderBy: { title: 'asc' },
    });
    res.json({ success: true, data: pages });
  } catch (error) { next(error); }
});

// 2. GET /:owner/:repo/:slug - Get wiki page by slug
router.get('/:owner/:repo/:slug', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo, slug } = req.params;
    const repository = await getRepository(owner, repo);
    if (!repository) throw createError('Repository not found', 404);

    const page = await prisma.wikiPage.findFirst({
      where: { repoId: repository.id, slug },
      include: { _count: { select: { revisions: true } } },
    });
    if (!page) throw createError('Wiki page not found', 404);
    res.json({ success: true, data: page });
  } catch (error) { next(error); }
});

// 3. POST /:owner/:repo - Create wiki page
router.post('/:owner/:repo', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;
    const { owner, repo } = req.params;
    const repository = await getRepository(owner, repo);
    if (!repository) throw createError('Repository not found', 404);

    const { title, content } = createWikiSchema.parse(req.body);
    const slug = slugify(title);

    const existing = await prisma.wikiPage.findFirst({ where: { repoId: repository.id, slug } });
    if (existing) throw createError('A page with this slug already exists', 409);

    const page = await prisma.wikiPage.create({
      data: {
        repoId: repository.id, title, slug, content, authorId: userId,
        revisions: { create: { content, message: 'Initial commit', authorId: userId } },
      },
    });
    res.status(201).json({ success: true, data: page });
  } catch (error) { next(error); }
});

// 4. PUT /:owner/:repo/:slug - Update wiki page
router.put('/:owner/:repo/:slug', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;
    const { owner, repo, slug } = req.params;
    const repository = await getRepository(owner, repo);
    if (!repository) throw createError('Repository not found', 404);

    const page = await prisma.wikiPage.findFirst({ where: { repoId: repository.id, slug } });
    if (!page) throw createError('Wiki page not found', 404);

    const { title, content, message } = updateWikiSchema.parse(req.body);
    let newSlug = page.slug;
    if (title && title !== page.title) {
      newSlug = slugify(title);
      const conflict = await prisma.wikiPage.findFirst({ where: { repoId: repository.id, slug: newSlug } });
      if (conflict && conflict.id !== page.id) throw createError('A page with this slug already exists', 409);
    }

    const updatedPage = await prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        title: title || page.title, slug: newSlug, content,
        revisions: { create: { content: page.content, message: message || 'Updated wiki page', authorId: userId } },
      },
    });
    res.json({ success: true, data: updatedPage });
  } catch (error) { next(error); }
});

// 5. DELETE /:owner/:repo/:slug - Delete wiki page
router.delete('/:owner/:repo/:slug', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;
    const { owner, repo, slug } = req.params;
    const repository = await getRepository(owner, repo);
    if (!repository) throw createError('Repository not found', 404);
    if (repository.ownerId !== userId) throw createError('Only repo owner can delete wiki pages', 403);

    const page = await prisma.wikiPage.findFirst({ where: { repoId: repository.id, slug } });
    if (!page) throw createError('Wiki page not found', 404);

    await prisma.wikiPage.delete({ where: { id: page.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

// 6. GET /:owner/:repo/:slug/revisions - Revision history
router.get('/:owner/:repo/:slug/revisions', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo, slug } = req.params;
    const repository = await getRepository(owner, repo);
    if (!repository) throw createError('Repository not found', 404);

    const page = await prisma.wikiPage.findFirst({ where: { repoId: repository.id, slug } });
    if (!page) throw createError('Wiki page not found', 404);

    const revisions = await prisma.wikiRevision.findMany({
      where: { pageId: page.id },
      select: { id: true, message: true, authorId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: revisions });
  } catch (error) { next(error); }
});

export default router;
