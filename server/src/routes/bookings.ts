import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';
import { serializeBooking } from '../lib/serialize';
import { getConsecutiveSlots, MAX_BOOKING_HOURS, DATE_RE, todayIST } from '../lib/constants';

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
  if (typeof date !== 'string' || !DATE_RE.test(date) || isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'Invalid date' });
  }
  if (date < todayIST()) {
    return res.status(400).json({ error: 'Cannot book a date in the past' });
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > MAX_BOOKING_HOURS) {
    return res.status(400).json({ error: `Duration must be between 1 and ${MAX_BOOKING_HOURS} hours` });
  }
  if (typeof customerPhone !== 'string' || !/^[+\d][\d\s-]{6,15}$/.test(customerPhone)) {
    return res.status(400).json({ error: 'Please enter a valid phone number' });
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
    const booking = await prisma.$transaction(
      async (tx) => {
        // Validate every requested hour is free before inserting anything.
        // Existing bookings are stored by START slot only, so each must be
        // expanded by its duration — a 2h booking at 10:00 also occupies the
        // 11:00 slot even though its stored timeSlot is '10:00 - 11:00'.
        // Serializable isolation makes Postgres abort one side of any
        // concurrent read-then-write race on the same slots.
        const existing = await tx.booking.findMany({
          where: { locationId, turfConfigId, date, status: { not: 'Cancelled' } },
          select: { timeSlot: true, duration: true },
        });
        const occupied = new Set<string>();
        for (const b of existing) {
          (getConsecutiveSlots(b.timeSlot, b.duration) || [b.timeSlot]).forEach((s) => occupied.add(s));
        }
        if (slots.some((s) => occupied.has(s))) {
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.status(201).json(serializeBooking(booking));
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2002' || err.code === 'P2034')) {
      // P2002: unique-constraint backstop; P2034: serialization conflict —
      // either way someone else grabbed an overlapping slot first.
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
