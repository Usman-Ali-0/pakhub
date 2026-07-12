import { Router } from 'express';
import prisma from '../lib/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/search/repositories
router.get('/repositories', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const lang = req.query.language as string;
    const sort = (req.query.sort as string) || 'stars';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const where: any = {
      isPrivate: false,
      OR: q ? [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { topics: { has: q } },
      ] : undefined,
    };
    if (lang) where.language = { equals: lang, mode: 'insensitive' };

    const orderBy: any =
      sort === 'updated' ? { updatedAt: 'desc' }
      : sort === 'forks' ? { forksCount: 'desc' }
      : sort === 'name' ? { name: 'asc' }
      : { starsCount: 'desc' };

    const [repos, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        select: {
          id: true, name: true, description: true, isPrivate: true,
          starsCount: true, forksCount: true, language: true,
          topics: true, updatedAt: true, createdAt: true,
          owner: { select: { username: true, avatarUrl: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.repository.count({ where }),
    ]);

    res.json({ success: true, data: repos, pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

// GET /api/search/users
router.get('/users', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const where: any = q ? {
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, name: true, avatarUrl: true, bio: true, location: true,
          _count: { select: { repositories: true, followers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

// GET /api/search/issues
router.get('/issues', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const state = (req.query.state as string) || 'OPEN';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where: {
          state: state as any,
          repo: { isPrivate: false },
          OR: q ? [
            { title: { contains: q, mode: 'insensitive' } },
            { body: { contains: q, mode: 'insensitive' } },
          ] : undefined,
        },
        select: {
          id: true, number: true, title: true, state: true, createdAt: true,
          author: { select: { username: true, avatarUrl: true } },
          repo: { select: { name: true, owner: { select: { username: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.issue.count({
        where: {
          state: state as any,
          repo: { isPrivate: false },
          OR: q ? [
            { title: { contains: q, mode: 'insensitive' } },
            { body: { contains: q, mode: 'insensitive' } },
          ] : undefined,
        },
      }),
    ]);

    res.json({ success: true, data: issues, pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

// GET /api/search — Global search
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q) return res.json({ success: true, data: { repositories: [], users: [], issues: [] } });

    const [repositories, users, issues] = await Promise.all([
      prisma.repository.findMany({
        where: {
          isPrivate: false,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, description: true, starsCount: true, language: true, owner: { select: { username: true } } },
        take: 5,
        orderBy: { starsCount: 'desc' },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, username: true, name: true, avatarUrl: true, bio: true },
        take: 5,
      }),
      prisma.issue.findMany({
        where: {
          repo: { isPrivate: false },
          OR: [{ title: { contains: q, mode: 'insensitive' } }],
        },
        select: {
          id: true, number: true, title: true, state: true,
          repo: { select: { name: true, owner: { select: { username: true } } } },
        },
        take: 5,
      }),
    ]);

    res.json({ success: true, data: { repositories, users, issues } });
  } catch (err) { next(err); }
});

export default router;
