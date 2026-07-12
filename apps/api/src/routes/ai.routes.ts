import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import * as aiService from '../services/ai.service';
import { encryptApiKey } from '../services/auth.service';

const router = Router();

// POST /api/ai/copilot — Get code completion
router.post('/copilot', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { prefix, suffix, language } = req.body;
    if (!prefix) throw createError('Code prefix required', 400);
    const completion = await aiService.getCopilotCompletion(prefix, suffix || '', language || 'javascript', req.user!.id);
    res.json({ success: true, data: { completion } });
  } catch (err) { next(err); }
});

// POST /api/ai/explain
router.post('/explain', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code, language } = req.body;
    if (!code) throw createError('Code required', 400);
    const explanation = await aiService.explainCode(code, language || 'javascript', req.user!.id);
    res.json({ success: true, data: { explanation } });
  } catch (err) { next(err); }
});

// POST /api/ai/commit-message
router.post('/commit-message', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { diff } = req.body;
    if (!diff) throw createError('Diff required', 400);
    const message = await aiService.suggestCommitMessage(diff, req.user!.id);
    res.json({ success: true, data: { message } });
  } catch (err) { next(err); }
});

// POST /api/ai/chat
router.post('/chat', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
      context: z.object({
        repoName: z.string().optional(),
        filePath: z.string().optional(),
        fileContent: z.string().optional(),
      }).optional(),
    });
    const { messages, context } = schema.parse(req.body);
    const reply = await aiService.chatWithAI(messages, context || {}, req.user!.id);
    res.json({ success: true, data: { reply } });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

// GET /api/ai/providers — Get user's AI providers
router.get('/providers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const providers = await prisma.userAiProvider.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true, provider: true, selectedModel: true, isDefault: true, useFor: true, endpoint: true, createdAt: true,
        // Never return encryptedApiKey
      },
    });
    res.json({ success: true, data: providers });
  } catch (err) { next(err); }
});

// POST /api/ai/providers — Add/update AI provider
router.post('/providers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      provider: z.enum(['GEMINI', 'GROQ', 'OPENAI', 'ANTHROPIC', 'MISTRAL', 'COHERE', 'OLLAMA', 'CUSTOM']),
      apiKey: z.string().min(1),
      selectedModel: z.string(),
      endpoint: z.string().optional(),
      isDefault: z.boolean().default(true),
      useFor: z.array(z.string()).default(['copilot', 'review', 'chat']),
    });
    const data = schema.parse(req.body);
    const encryptedApiKey = encryptApiKey(data.apiKey);

    const provider = await prisma.userAiProvider.upsert({
      where: { userId_provider: { userId: req.user!.id, provider: data.provider } },
      update: { encryptedApiKey, selectedModel: data.selectedModel, isDefault: data.isDefault, useFor: data.useFor, endpoint: data.endpoint },
      create: {
        userId: req.user!.id,
        provider: data.provider,
        encryptedApiKey,
        selectedModel: data.selectedModel,
        isDefault: data.isDefault,
        useFor: data.useFor,
        endpoint: data.endpoint,
      },
      select: { id: true, provider: true, selectedModel: true, isDefault: true, useFor: true, endpoint: true, createdAt: true },
    });
    res.json({ success: true, data: provider });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors[0]?.message });
    next(err);
  }
});

// DELETE /api/ai/providers/:id
router.delete('/providers/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const provider = await prisma.userAiProvider.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!provider) throw createError('Provider not found', 404);
    await prisma.userAiProvider.delete({ where: { id: provider.id } });
    res.json({ success: true, message: 'AI provider removed' });
  } catch (err) { next(err); }
});

export default router;
