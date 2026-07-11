import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const locations = await prisma.location.findMany({
    include: { turfConfigs: true },
    orderBy: { name: 'asc' },
  });
  res.json(locations);
});

router.get('/:id', async (req, res) => {
  const location = await prisma.location.findUnique({
    where: { id: req.params.id },
    include: { turfConfigs: true },
  });
  if (!location) return res.status(404).json({ error: 'Location not found' });
  res.json(location);
});

export default router;
