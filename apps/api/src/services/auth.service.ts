import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import prisma from '../lib/prisma';
import { config } from '../config';
import { createError } from '../middleware/error.middleware';

// ─────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.refreshSecret, { expiresIn: '30d' });
}

export async function verifyAccessToken(token: string) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    return await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, isAdmin: true },
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Auth operations
// ─────────────────────────────────────────────────────────

export async function register(data: {
  username: string;
  email: string;
  password: string;
  name?: string;
}) {
  // Check uniqueness
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: data.username }, { email: data.email }] },
  });
  if (existing) {
    if (existing.username === data.username) throw createError('Username already taken', 409);
    if (existing.email === data.email) throw createError('Email already registered', 409);
  }

  // Validate username
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(data.username)) {
    throw createError('Username can only contain letters, numbers, and hyphens', 400);
  }
  if (data.username.length < 3 || data.username.length > 39) {
    throw createError('Username must be between 3 and 39 characters', 400);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      name: data.name || data.username,
      passwordHash,
    },
    select: {
      id: true, username: true, email: true, name: true,
      bio: true, avatarUrl: true, isAdmin: true, emailVerified: true,
      createdAt: true, updatedAt: true,
    },
  });

  return {
    user,
    accessToken: generateAccessToken(user.id),
    refreshToken: generateRefreshToken(user.id),
  };
}

export async function login(data: { login: string; password: string; totpCode?: string }) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.login }, { username: data.login }],
    },
  });

  if (!user) throw createError('Invalid credentials', 401);

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw createError('Invalid credentials', 401);

  // TOTP check
  if (user.totpEnabled && user.totpSecret) {
    if (!data.totpCode) throw createError('2FA code required', 403);
    const isValidTotp = authenticator.verify({
      token: data.totpCode,
      secret: user.totpSecret,
    });
    if (!isValidTotp) throw createError('Invalid 2FA code', 401);
  }

  const { passwordHash, totpSecret, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken: generateAccessToken(user.id),
    refreshToken: generateRefreshToken(user.id),
  };
}

export async function refreshTokens(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw createError('User not found', 401);

    return {
      accessToken: generateAccessToken(user.id),
      refreshToken: generateRefreshToken(user.id),
    };
  } catch {
    throw createError('Invalid refresh token', 401);
  }
}

export async function enableTotp(userId: string) {
  const secret = authenticator.generateSecret();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createError('User not found', 404);

  await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });

  const otpauth = authenticator.keyuri(user.email, config.app.name, secret);
  return { secret, otpauth };
}

export async function verifyAndEnableTotp(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) throw createError('TOTP not initialized', 400);

  const valid = authenticator.verify({ token: code, secret: user.totpSecret });
  if (!valid) throw createError('Invalid TOTP code', 400);

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
  return { success: true };
}

export async function disableTotp(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createError('User not found', 404);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw createError('Invalid password', 401);

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null },
  });
  return { success: true };
}

// ─────────────────────────────────────────────────────────
// Encryption (for BYOAI keys)
// ─────────────────────────────────────────────────────────

export function encryptApiKey(plaintext: string): string {
  const key = Buffer.from(config.ai.encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptApiKey(encrypted: string): string {
  const key = Buffer.from(config.ai.encryptionKey.padEnd(32, '0').slice(0, 32));
  const [ivHex, encHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encBuf = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf8');
}
