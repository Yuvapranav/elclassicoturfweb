import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../lib/auth';
import { serializeBooking } from '../lib/serialize';
import {
  todayIST,
  currentMonthIST,
  lastMonthIST,
  lastNDatesIST,
  getConsecutiveSlots,
  DATE_RE,
  MAX_BOOKING_HOURS,
} from '../lib/constants';

const router = Router();

router.use(requireAdmin);

router.get('/stats', async (_req, res) => {
  const today = todayIST();
  const month = currentMonthIST();

  const [todayBookings, monthBookings, turfConfigCount] = await Promise.all([
    prisma.booking.findMany({ where: { date: today, status: { not: 'Cancelled' } } }),
    prisma.booking.count({
      where: { date: { startsWith: month }, status: { not: 'Cancelled' } },
    }),
    prisma.turfConfig.count(),
  ]);

  const totalBookingsToday = todayBookings.length;
  const totalRevenueToday = todayBookings
    .filter((b) => b.paymentStatus === 'Paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const TIME_SLOTS_COUNT = 24;
  const totalAvailableSlots = turfConfigCount * TIME_SLOTS_COUNT;
  const bookedSlotsCount = todayBookings.reduce((sum, b) => sum + b.duration, 0);
  const occupancyRate = totalAvailableSlots > 0
    ? Math.round((bookedSlotsCount / totalAvailableSlots) * 100)
    : 0;

  res.json({
    totalBookingsToday,
    totalRevenueToday,
    totalBookingsThisMonth: monthBookings,
    occupancyRate: Math.min(occupancyRate, 100),
  });
});

// Deeper business analytics for the "Sales & Insights" view: money collected
// vs still owed, month-over-month trend, per-branch revenue, a 30-day series,
// the single best sales day, and the busiest time slots.
router.get('/analytics', async (_req, res) => {
  const today = todayIST();
  const thisMonth = currentMonthIST();
  const prevMonth = lastMonthIST();

  // Real customer bookings only (exclude the zero-value ADMIN LOCK rows).
  const bookings = await prisma.booking.findMany({
    where: { customerName: { not: 'ADMIN LOCK' } },
    include: { location: true },
  });

  const active = bookings.filter((b) => b.status !== 'Cancelled');
  const paid = active.filter((b) => b.paymentStatus === 'Paid');
  const pending = active.filter((b) => b.paymentStatus === 'Pending');
  const sum = (arr: typeof bookings) => arr.reduce((s, b) => s + b.amount, 0);

  const revenue = {
    today: sum(paid.filter((b) => b.date === today)),
    thisMonth: sum(paid.filter((b) => b.date.startsWith(thisMonth))),
    lastMonth: sum(paid.filter((b) => b.date.startsWith(prevMonth))),
    outstanding: sum(pending), // money booked but not yet collected
    collectedAllTime: sum(paid),
  };

  const counts = {
    paid: paid.length,
    pending: pending.length,
    cancelled: bookings.length - active.length,
    active: active.length,
  };

  // Revenue + booking count per branch (paid revenue).
  const branchMap = new Map<string, { locationId: string; name: string; revenue: number; bookings: number }>();
  for (const b of active) {
    const key = b.locationId;
    const row = branchMap.get(key) || { locationId: key, name: b.location.name, revenue: 0, bookings: 0 };
    row.bookings += 1;
    if (b.paymentStatus === 'Paid') row.revenue += b.amount;
    branchMap.set(key, row);
  }
  const revenueByBranch = Array.from(branchMap.values()).sort((a, b) => b.revenue - a.revenue);

  // 30-day daily series (paid revenue + booking count), oldest first.
  const dates = lastNDatesIST(30);
  const dailyTrend = dates.map((date) => {
    const dayActive = active.filter((b) => b.date === date);
    return {
      date,
      revenue: sum(dayActive.filter((b) => b.paymentStatus === 'Paid')),
      bookings: dayActive.length,
    };
  });
  const bestDay = dailyTrend.reduce<{ date: string; revenue: number } | null>((best, d) => {
    if (d.revenue > 0 && (!best || d.revenue > best.revenue)) return { date: d.date, revenue: d.revenue };
    return best;
  }, null);

  // Busiest time slots across all active bookings.
  const slotMap = new Map<string, number>();
  for (const b of active) slotMap.set(b.timeSlot, (slotMap.get(b.timeSlot) || 0) + 1);
  const peakSlots = Array.from(slotMap.entries())
    .map(([timeSlot, count]) => ({ timeSlot, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  res.json({ revenue, counts, revenueByBranch, dailyTrend, bestDay, peakSlots });
});

router.get('/bookings', async (req, res) => {
  const { status, date, locationId } = req.query as Record<string, string>;

  const where: any = {};
  if (status) where.status = status;
  if (date) where.date = date;
  if (locationId) where.locationId = locationId;

  const bookings = await prisma.booking.findMany({
    where,
    include: { turfConfig: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(bookings.map(serializeBooking));
});

const VALID_STATUSES = ['Confirmed', 'Completed', 'Cancelled'];
const VALID_PAYMENT_STATUSES = ['Paid', 'Pending'];

router.patch('/bookings/:id', async (req, res) => {
  const { status, paymentStatus } = req.body || {};
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    return res.status(400).json({ error: `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` });
  }
  const data: any = {};
  if (status) data.status = status;
  if (paymentStatus) data.paymentStatus = paymentStatus;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { turfConfig: true },
    });
    res.json(serializeBooking(booking));
  } catch (err) {
    res.status(404).json({ error: 'Booking not found' });
  }
});

// Owner books a slot on behalf of a caller / walk-in. Records a real booking
// (real name + phone, counts toward revenue and the customer directory),
// unlike /slot-block which just holds an anonymous slot.
router.post('/manual-booking', async (req, res) => {
  const { locationId, turfConfigId, date, timeSlot, duration, customerName, customerPhone, paymentStatus } = req.body || {};

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

  const turfConfig = await prisma.turfConfig.findUnique({ where: { id: turfConfigId } });
  if (!turfConfig || turfConfig.locationId !== locationId) {
    return res.status(400).json({ error: 'Invalid location/turf configuration' });
  }

  const slots = getConsecutiveSlots(timeSlot, duration);
  if (!slots) {
    return res.status(400).json({ error: 'Invalid time slot / duration combination' });
  }

  const amount = turfConfig.pricePerHour * duration;
  const payStatus = paymentStatus === 'Paid' ? 'Paid' : 'Pending';

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
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
            customerName,
            customerPhone,
            locationId,
            turfConfigId,
            date,
            timeSlot,
            duration,
            amount,
            paymentMethod: 'Cash',
            paymentStatus: payStatus,
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
      return res.status(409).json({ error: 'One or more of those slots is already booked' });
    }
    if (err?.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'One or more of those slots is already booked' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.post('/slot-block', async (req, res) => {
  const { locationId, turfConfigId, date, timeSlot } = req.body || {};
  if (!locationId || !turfConfigId || !date || !timeSlot) {
    return res.status(400).json({ error: 'locationId, turfConfigId, date, and timeSlot are required' });
  }

  const turfConfig = await prisma.turfConfig.findUnique({ where: { id: turfConfigId } });
  if (!turfConfig || turfConfig.locationId !== locationId) {
    return res.status(400).json({ error: 'Invalid location/turf configuration' });
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        customerName: 'ADMIN LOCK',
        customerPhone: 'N/A',
        locationId,
        turfConfigId,
        date,
        timeSlot,
        duration: 1,
        amount: 0,
        paymentMethod: null,
        paymentStatus: 'Paid',
        status: 'Confirmed',
      },
      include: { turfConfig: true },
    });
    res.status(201).json(serializeBooking(booking));
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Slot already occupied' });
    }
    res.status(500).json({ error: 'Failed to block slot' });
  }
});

router.delete('/slot-block/:id', async (req, res) => {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: 'Booking not found' });
  }
});

router.get('/customers', async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'Cancelled' }, customerName: { not: 'ADMIN LOCK' } },
    select: { customerName: true, customerPhone: true, amount: true, date: true },
  });

  const byPhone = new Map<string, { name: string; phone: string; bookingsCount: number; totalSpend: number; lastBookingDate: string }>();

  for (const b of bookings) {
    const key = b.customerPhone || b.customerName;
    const existing = byPhone.get(key);
    if (!existing) {
      byPhone.set(key, {
        name: b.customerName,
        phone: b.customerPhone || 'N/A',
        bookingsCount: 1,
        totalSpend: b.amount,
        lastBookingDate: b.date,
      });
    } else {
      existing.bookingsCount += 1;
      existing.totalSpend += b.amount;
      if (b.date > existing.lastBookingDate) existing.lastBookingDate = b.date;
    }
  }

  const customers = Array.from(byPhone.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  res.json(customers);
});

export default router;
