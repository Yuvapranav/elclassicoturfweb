import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, signToken, COOKIE_NAME, cookieOptions, requireAuth } from '../lib/auth';

const router = Router();

function serializeUser(u: { id: string; email: string; name: string; phone: string | null; role: string }) {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role };
}

router.post('/signup', async (req, res) => {
  const { email, password, name, phone } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, phone: phone || null },
  });

  const token = signToken({ userId: user.id });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.status(201).json(serializeUser(user));
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

  const token = signToken({ userId: user.id });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.json(serializeUser(user));
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(serializeUser(req.user!));
});

export default router;
