import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createSession,
  revokeByToken,
  COOKIE_NAME,
  cookieOptions,
  requireAuth,
} from '../lib/auth';

const router = Router();

function serializeUser(
  u: { id: string; email: string; name: string; phone: string | null; role: string },
  csrfToken?: string,
) {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, csrfToken };
}

router.post('/signup', async (req, res) => {
  const { email, password, name, phone } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, phone: phone || null },
  });

  const { token, csrfToken } = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.status(201).json(serializeUser(user, csrfToken));
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { token, csrfToken } = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.json(serializeUser(user, csrfToken));
});

router.post('/logout', async (req, res) => {
  // Revoke server-side so the token is dead immediately, not just cleared client-side.
  await revokeByToken(req.cookies?.[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  // Return this session's CSRF token so the SPA can resume after a page reload
  // (its in-memory copy is gone) without forcing a re-login.
  const session = req.sessionId
    ? await prisma.session.findUnique({ where: { id: req.sessionId } })
    : null;
  res.json(serializeUser(req.user!, session?.csrfToken));
});

export default router;
