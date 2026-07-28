import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import qrcode from 'qrcode';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';
import { createError } from '../middleware/error.middleware';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(39),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
});

const loginSchema = z.object({
  login: z.string(),
  password: z.string(),
  totpCode: z.string().optional(),
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0]?.message });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0]?.message });
    }
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError('Refresh token required', 400);
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, username: true, email: true, name: true, bio: true,
        avatarUrl: true, website: true, location: true, twitterHandle: true,
        totpEnabled: true, isAdmin: true, emailVerified: true,
        preferredLanguage: true,
        createdAt: true, updatedAt: true,
        _count: {
          select: {
            repositories: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().max(100).optional(),
      bio: z.string().max(500).optional(),
      website: z.string().url().optional().or(z.literal('')),
      location: z.string().max(100).optional(),
      twitterHandle: z.string().max(50).optional(),
      preferredLanguage: z.string().max(10).optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true, username: true, email: true, name: true,
        bio: true, avatarUrl: true, website: true, location: true,
        twitterHandle: true, preferredLanguage: true, updatedAt: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0]?.message });
    }
    next(err);
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw createError('Both passwords required', 400);
    if (newPassword.length < 8) throw createError('New password must be at least 8 characters', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw createError('User not found', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw createError('Current password is incorrect', 401);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
});

// POST /api/auth/totp/enable — Get TOTP secret & QR code
router.post('/totp/enable', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { secret, otpauth } = await authService.enableTotp(req.user!.id);
    const qrDataUrl = await qrcode.toDataURL(otpauth);
    res.json({ success: true, data: { secret, qrCode: qrDataUrl } });
  } catch (err) { next(err); }
});

// POST /api/auth/totp/verify — Verify & activate TOTP
router.post('/totp/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.body;
    if (!code) throw createError('TOTP code required', 400);
    const result = await authService.verifyAndEnableTotp(req.user!.id, code);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/totp/disable
router.post('/totp/disable', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { password } = req.body;
    if (!password) throw createError('Password required', 400);
    const result = await authService.disableTotp(req.user!.id, password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/auth/ssh-keys
router.get('/ssh-keys', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const keys = await prisma.sshKey.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: keys });
  } catch (err) { next(err); }
});

// POST /api/auth/ssh-keys
router.post('/ssh-keys', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { title, publicKey } = req.body;
    if (!title || !publicKey) throw createError('Title and public key required', 400);

    // Basic validation
    if (!publicKey.startsWith('ssh-') && !publicKey.startsWith('ecdsa-') && !publicKey.startsWith('sk-')) {
      throw createError('Invalid SSH public key format', 400);
    }

    // Generate fingerprint
    const parts = publicKey.trim().split(' ');
    const fingerprint = parts[1]?.slice(0, 16) || 'unknown';

    const key = await prisma.sshKey.create({
      data: { userId: req.user!.id, title, publicKey: publicKey.trim(), fingerprint },
    });
    res.status(201).json({ success: true, data: key });
  } catch (err) { next(err); }
});

// DELETE /api/auth/ssh-keys/:id
router.delete('/ssh-keys/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const key = await prisma.sshKey.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!key) throw createError('SSH key not found', 404);
    await prisma.sshKey.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'SSH key deleted' });
  } catch (err) { next(err); }
});

export default router;
