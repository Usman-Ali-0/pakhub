import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();

// Validation Schemas
const categorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  emoji: z.string().optional(),
  isAnswerable: z.boolean().optional(),
});

const discussionSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1),
  categoryId: z.string().uuid(),
});

const updateDiscussionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  body: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  categoryId: z.string().uuid().optional(),
});

const commentSchema = z.object({
  body: z.string().min(1),
  parentId: z.string().uuid().optional(),
});

// Helper to get repo
const getRepo = async (owner: string, repo: string) => {
  const repository = await prisma.repository.findFirst({
    where: {
      name: repo,
      owner: {
        username: owner,
      },
    },
    include: {
      owner: true,
    },
  });
  return repository;
};

// 1. GET /:owner/:repo/categories - List categories for repo
router.get('/:owner/:repo/categories', optionalAuth, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const categories = await prisma.discussionCategory.findMany({
      where: { repoId: repository.id },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// 2. POST /:owner/:repo/categories - Create category (auth, repo owner only)
router.post('/:owner/:repo/categories', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user!.id;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    if (repository.ownerId !== userId) {
      throw createError('Only repository owner can create categories', 403);
    }

    const validatedData = categorySchema.parse(req.body);

    const category = await prisma.discussionCategory.create({
      data: {
        ...validatedData,
        repoId: repository.id,
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// 3. GET /:owner/:repo - List discussions with pagination
router.get('/:owner/:repo', optionalAuth, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { category, page = '1', limit = '20', sort = 'newest' } = req.query;

    const repository = await getRepo(owner, repo);
    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = { repoId: repository.id };
    if (category) {
      whereClause.categoryId = category;
    }

    const orderBy: any = sort === 'oldest' ? { createdAt: 'asc' as const } : { createdAt: 'desc' as const };

    const [discussions, total] = await Promise.all([
      prisma.discussion.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy,
        include: {
          author: {
            select: {
              username: true,
              avatarUrl: true,
            },
          },
          category: true,
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.discussion.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: {
        discussions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /:owner/:repo - Create discussion (auth required)
router.post('/:owner/:repo', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.user!.id;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const { title, body, categoryId } = discussionSchema.parse(req.body);

    const category = await prisma.discussionCategory.findFirst({
      where: { id: categoryId, repoId: repository.id },
    });

    if (!category) {
      throw createError('Category not found in this repository', 404);
    }

    const discussionCount = await prisma.discussion.count({
      where: { repoId: repository.id },
    });

    const discussion = await prisma.discussion.create({
      data: {
        repoId: repository.id,
        categoryId,
        authorId: userId,
        number: discussionCount + 1,
        title,
        body,
      },
    });

    res.status(201).json({ success: true, data: discussion });
  } catch (error) {
    next(error);
  }
});

// 5. GET /:owner/:repo/:number - Get single discussion by number
router.get('/:owner/:repo/:number', optionalAuth, async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const discussion = await prisma.discussion.findFirst({
      where: { repoId: repository.id, number: parseInt(number, 10) },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        category: true,
        comments: {
          include: {
            author: { select: { username: true, avatarUrl: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    if (!discussion) {
      throw createError('Discussion not found', 404);
    }

    res.json({ success: true, data: discussion });
  } catch (error) {
    next(error);
  }
});

// 6. PATCH /:owner/:repo/:number - Update discussion
router.patch('/:owner/:repo/:number', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const userId = req.user!.id;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const discussion = await prisma.discussion.findFirst({
      where: { repoId: repository.id, number: parseInt(number, 10) },
    });

    if (!discussion) {
      throw createError('Discussion not found', 404);
    }

    if (discussion.authorId !== userId && repository.ownerId !== userId) {
      throw createError('Not authorized to update this discussion', 403);
    }

    const updates = updateDiscussionSchema.parse(req.body);

    const updatedDiscussion = await prisma.discussion.update({
      where: { id: discussion.id },
      data: updates,
    });

    res.json({ success: true, data: updatedDiscussion });
  } catch (error) {
    next(error);
  }
});

// 7. DELETE /:owner/:repo/:number - Delete discussion
router.delete('/:owner/:repo/:number', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const userId = req.user!.id;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const discussion = await prisma.discussion.findFirst({
      where: { repoId: repository.id, number: parseInt(number, 10) },
    });

    if (!discussion) {
      throw createError('Discussion not found', 404);
    }

    if (discussion.authorId !== userId && repository.ownerId !== userId) {
      throw createError('Not authorized to delete this discussion', 403);
    }

    await prisma.discussion.delete({
      where: { id: discussion.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// 8. GET /:owner/:repo/:number/comments - List comments for discussion
router.get('/:owner/:repo/:number/comments', optionalAuth, async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const discussion = await prisma.discussion.findFirst({
      where: { repoId: repository.id, number: parseInt(number, 10) },
    });

    if (!discussion) {
      throw createError('Discussion not found', 404);
    }

    const comments = await prisma.discussionComment.findMany({
      where: { discussionId: discussion.id },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        replies: {
          include: {
            author: { select: { username: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
});

// 9. POST /:owner/:repo/:number/comments - Add comment
router.post('/:owner/:repo/:number/comments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const userId = req.user!.id;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const discussion = await prisma.discussion.findFirst({
      where: { repoId: repository.id, number: parseInt(number, 10) },
    });

    if (!discussion) {
      throw createError('Discussion not found', 404);
    }

    if (discussion.isLocked) {
      throw createError('Discussion is locked', 403);
    }

    const { body, parentId } = commentSchema.parse(req.body);

    const comment = await prisma.discussionComment.create({
      data: {
        discussionId: discussion.id,
        authorId: userId,
        body,
        parentId,
      },
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
});

// 10. POST /:owner/:repo/:number/comments/:commentId/answer - Mark comment as answer
router.post('/:owner/:repo/:number/comments/:commentId/answer', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { owner, repo, number, commentId } = req.params;
    const userId = req.user!.id;
    const repository = await getRepo(owner, repo);

    if (!repository) {
      throw createError('Repository not found', 404);
    }

    const discussion = await prisma.discussion.findFirst({
      where: { repoId: repository.id, number: parseInt(number, 10) },
      include: { category: true },
    });

    if (!discussion) {
      throw createError('Discussion not found', 404);
    }

    if (discussion.authorId !== userId) {
      throw createError('Only discussion author can mark an answer', 403);
    }

    if (!discussion.category.isAnswerable) {
      throw createError('This discussion category does not support answers', 400);
    }

    const comment = await prisma.discussionComment.findFirst({
      where: { id: commentId, discussionId: discussion.id },
    });

    if (!comment) {
      throw createError('Comment not found in this discussion', 404);
    }

    // Unmark previous answer if exists
    if (discussion.answerId) {
      await prisma.discussionComment.update({
        where: { id: discussion.answerId },
        data: { isAnswer: false },
      });
    }

    const [updatedComment, updatedDiscussion] = await Promise.all([
      prisma.discussionComment.update({
        where: { id: comment.id },
        data: { isAnswer: true },
      }),
      prisma.discussion.update({
        where: { id: discussion.id },
        data: { answerId: comment.id },
      }),
    ]);

    res.json({ comment: updatedComment, discussion: updatedDiscussion });
  } catch (error) {
    next(error);
  }
});

export default router;
