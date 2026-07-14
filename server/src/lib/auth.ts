import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';

// Never fall back to a hardcoded secret: a known signing key lets anyone forge
// a valid admin token. Refuse to start in production, and use an obviously
// ephemeral per-boot secret in dev (so a missing .env is a loud dev-only
// annoyance, not a silent prod backdoor).
const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32 && secret !== 'change-me') return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a strong (32+ char) value in production');
  }
  console.warn('[auth] JWT_SECRET missing/weak — using a random dev-only secret; sessions reset on restart.');
  return require('crypto').randomBytes(48).toString('hex');
})();

const SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = 'token';

// In production the frontend (GitHub Pages) and API (Render) live on different
// sites, so the auth cookie must be SameSite=None — and browsers only accept
// that combined with Secure. Locally we keep Lax so plain http still works.
const isProduction = process.env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Augment Express Request with the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        phone: string | null;
        role: string;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
