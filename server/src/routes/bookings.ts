import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { serializeBooking } from '../lib/serialize';
import { getConsecutiveSlots } from '../lib/constants';

const router = Router();

router.get('/mine', requireAuth, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: { turfConfig: true },
    orderBy: { date: 'desc' },
  });
  res.json(bookings.map(serializeBooking));
});

// Public: returns which slots are already booked for a given location/turf/date
router.get('/availability', async (req, res) => {
  const { locationId, turfConfigId, date } = req.query as Record<string, string>;
  if (!locationId || !turfConfigId || !date) {
    return res.status(400).json({ error: 'locationId, turfConfigId, and date are required' });
  }

  const bookings = await prisma.booking.findMany({
    where: { locationId, turfConfigId, date, status: { not: 'Cancelled' } },
    select: { timeSlot: true, duration: true },
  });

  // Expand each booking into all the individual hour-slots it consumes so
  // multi-hour bookings correctly block every slot they occupy.
  const bookedSlots = new Set<string>();
  for (const b of bookings) {
    const slots = getConsecutiveSlots(b.timeSlot, b.duration) || [b.timeSlot];
    slots.forEach((s) => bookedSlots.add(s));
  }

  res.json({ bookedSlots: Array.from(bookedSlots) });
});

router.post('/', requireAuth, async (req, res) => {
  const { locationId, turfConfigId, date, timeSlot, duration, customerName, customerPhone, paymentMethod } = req.body || {};

  if (!locationId || !turfConfigId || !date || !timeSlot || !duration || !customerName || !customerPhone) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const turfConfig = await prisma.turfConfig.findUnique({ where: { id: turfConfigId } });
  if (!turfConfig || turfConfig.locationId !== locationId) {
    return res.status(400).json({ error: 'Invalid location/turf configuration' });
  }

  const slots = getConsecutiveSlots(timeSlot, duration);
  if (!slots) {
    return res.status(400).json({ error: 'Invalid time slot / duration combination' });
  }

  const amount = turfConfig.pricePerHour * duration;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Validate every consecutive slot is free before inserting anything.
      const clashes = await tx.booking.findMany({
        where: {
          locationId,
          turfConfigId,
          date,
          timeSlot: { in: slots },
          status: { not: 'Cancelled' },
        },
      });
      if (clashes.length > 0) {
        throw new Error('SLOT_TAKEN');
      }

      return tx.booking.create({
        data: {
          userId: req.user!.id,
          customerName,
          customerPhone,
          locationId,
          turfConfigId,
          date,
          timeSlot,
          duration,
          amount,
          paymentMethod: paymentMethod || null,
          paymentStatus: 'Pending',
          status: 'Confirmed',
        },
        include: { turfConfig: true },
      });
    });

    res.status(201).json(serializeBooking(booking));
  } catch (err: any) {
    // The unique constraint on (locationId, turfConfigId, date, timeSlot) is
    // the backstop in case of a race between the check above and the insert.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'Slot already booked' });
    }
    if (err?.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'Slot already booked' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;
