import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth';

const router = Router();

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys are not configured');
  }
  return new Razorpay({ key_id, key_secret });
}

router.post('/create-order', requireAuth, async (req, res) => {
  const { bookingId } = req.body || {};
  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId is required' });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: booking.amount * 100, // paise
      currency: 'INR',
      receipt: booking.id,
      notes: { bookingId: booking.id },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.id },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId: booking.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create payment order. Check Razorpay configuration.' });
  }
});

router.post('/verify-payment', async (req, res) => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ error: 'Razorpay is not configured' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment signature verification failed' });
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: 'Paid',
      razorpayPaymentId: razorpay_payment_id,
    },
  });

  res.json({ ok: true, bookingId: booking.id });
});

export default router;
