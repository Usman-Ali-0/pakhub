import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();

const userSelect = {
  id: true, username: true, email: true, name: true, bio: true,
  avatarUrl: true, website: true, location: true, twitterHandle: true,
  isAdmin: true, emailVerified: true, createdAt: true,
  _count: { select: { repositories: true, followers: true, following: true } },
};

// GET /api/users/:username
router.get('/:username', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: userSelect,
    });
    if (!user) throw createError('User not found', 404);

    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
      });
      isFollowing = !!follow;
    }

    res.json({
      success: true,
      data: {
        ...user,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        reposCount: user._count.repositories,
        _count: undefined,
        isFollowing,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/users/:username/repos
router.get('/:username/repos', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw createError('User not found', 404);

    const isOwner = req.user?.id === user.id;
    const repos = await prisma.repository.findMany({
      where: {
        ownerId: user.id,
        isPrivate: isOwner ? undefined : false,
      },
      select: {
        id: true, name: true, description: true, isPrivate: true,
        defaultBranch: true, starsCount: true, forksCount: true,
        language: true, topics: true, isArchived: true,
        createdAt: true, updatedAt: true,
        owner: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: repos });
  } catch (err) { next(err); }
});

// GET /api/users/:username/starred
router.get('/:username/starred', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw createError('User not found', 404);

    const stars = await prisma.star.findMany({
      where: { userId: user.id },
      include: {
        repo: {
          select: {
            id: true, name: true, description: true, isPrivate: true,
            starsCount: true, language: true, updatedAt: true,
            owner: { select: { username: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const publicStars = stars.filter(s => !s.repo.isPrivate);
    res.json({ success: true, data: publicStars.map(s => s.repo) });
  } catch (err) { next(err); }
});

// GET /api/users/:username/followers
router.get('/:username/followers', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw createError('User not found', 404);

    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: {
        follower: { select: { id: true, username: true, name: true, avatarUrl: true, bio: true } },
      },
    });
    res.json({ success: true, data: followers.map(f => f.follower) });
  } catch (err) { next(err); }
});

// GET /api/users/:username/following
router.get('/:username/following', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) throw createError('User not found', 404);

    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: { select: { id: true, username: true, name: true, avatarUrl: true, bio: true } },
      },
    });
    res.json({ success: true, data: following.map(f => f.following) });
  } catch (err) { next(err); }
});

// POST /api/users/:username/follow
router.post('/:username/follow', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) throw createError('User not found', 404);
    if (target.id === req.user!.id) throw createError('Cannot follow yourself', 400);

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user!.id, followingId: target.id } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      return res.json({ success: true, data: { following: false } });
    }

    await prisma.follow.create({ data: { followerId: req.user!.id, followingId: target.id } });
    res.json({ success: true, data: { following: true } });
  } catch (err) { next(err); }
});

// GET /api/users — List users (for search)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const where = q ? {
      OR: [
        { username: { contains: q, mode: 'insensitive' as const } },
        { name: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, username: true, name: true, avatarUrl: true, bio: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

export default router;
