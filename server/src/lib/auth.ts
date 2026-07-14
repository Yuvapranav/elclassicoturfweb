import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
  return crypto.randomBytes(48).toString('hex');
})();

const SALT_ROUNDS = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TokenPayload {
  userId: string;
  sessionId: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Creates a server-side session row (revocable) and returns the signed cookie
// token plus the CSRF token the client must echo back on mutating requests.
export async function createSession(userId: string): Promise<{ token: string; csrfToken: string }> {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const session = await prisma.session.create({
    data: {
      userId,
      csrfToken,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token: signToken({ userId, sessionId: session.id }), csrfToken };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

// Used by logout: decode whatever session the cookie points at and delete it.
export async function revokeByToken(token: string | undefined): Promise<void> {
  if (!token) return;
  const payload = verifyToken(token);
  if (payload?.sessionId) await revokeSession(payload.sessionId);
}

export const COOKIE_NAME = 'token';
export const CSRF_HEADER = 'x-csrf-token';

// In production the frontend (GitHub Pages) and API (Render) live on different
// sites, so the auth cookie must be SameSite=None — and browsers only accept
// that combined with Secure. Locally we keep Lax so plain http still works.
const isProduction = process.env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  maxAge: SESSION_TTL_MS,
};

// Augment Express Request with the authenticated user + session id
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
      sessionId?: string;
    }
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // The session row is the source of truth: if it's gone (logged out / revoked)
  // or expired, the token is dead even though its signature is still valid.
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.deleteMany({ where: { id: session.id } });
    return res.status(401).json({ error: 'Session expired' });
  }

  // CSRF: on state-changing requests the caller must echo the session's CSRF
  // token in a header. A cross-site attacker can ride the cookie but cannot
  // read this token (it's only handed to our own origin via the JSON API),
  // so a forged cross-site POST/PATCH/DELETE will be missing it.
  if (MUTATING_METHODS.has(req.method)) {
    const provided = req.get(CSRF_HEADER);
    if (!provided || provided !== session.csrfToken) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
  }

  const user = session.user;
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
  req.sessionId = session.id;
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
