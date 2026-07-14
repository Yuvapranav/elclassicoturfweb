import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../lib/auth';
import { serializeBooking } from '../lib/serialize';
import { todayIST, currentMonthIST } from '../lib/constants';

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
