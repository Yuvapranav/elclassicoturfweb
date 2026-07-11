import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Booking, TurfType, PaymentMethod } from '../types';
import { TURF_CONFIGS, TURF_LOCATIONS } from '../utils/mockData';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost, ApiError } from '../lib/api';
import {
  CreditCard,
  User as UserIcon,
  Phone,
  Check,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  bookingId: string;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Redirect to login if logged out
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=bookings');
    }
  }, [user, navigate]);

  // Extract navigation state
  const state = location.state as {
    locationId: string;
    turfConfigId: string;
    turfType: TurfType;
    date: string;
    timeSlot: string;
    duration: number;
    amount: number;
  } | null;

  // Form states
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const selectedLocation = useMemo(() => {
    if (!state) return null;
    return TURF_LOCATIONS.find(l => l.id === state.locationId);
  }, [state]);

  const selectedTurf = useMemo(() => {
    if (!state) return null;
    return TURF_CONFIGS.find(t => t.id === state.turfType);
  }, [state]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !user) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Please fill in contact details.');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      // 1. Reserve the slot server-side (throws 409 if already taken)
      const booking = await apiPost<Booking>('/bookings', {
        locationId: state.locationId,
        turfConfigId: state.turfConfigId,
        date: state.date,
        timeSlot: state.timeSlot,
        duration: state.duration,
        customerName,
        customerPhone,
        paymentMethod
      });

      if (paymentMethod === 'Cash') {
        // Pay at ground — no online payment needed
        setIsProcessing(false);
        setConfirmedBooking(booking);
        return;
      }

      // 2. Create a Razorpay test-mode order for this booking
      const order = await apiPost<RazorpayOrderResponse>('/payments/create-order', {
        bookingId: booking.id
      });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'El Classico Turf',
        description: `${selectedTurf?.name || 'Turf'} · ${state.date} @ ${state.timeSlot}`,
        order_id: order.orderId,
        prefill: {
          name: customerName,
          contact: customerPhone
        },
        theme: { color: '#00253c' },
        handler: async (response: any) => {
          try {
            await apiPost('/payments/verify-payment', {
              bookingId: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setConfirmedBooking({ ...booking, paymentStatus: 'Paid' });
          } catch (err) {
            setError('Payment verification failed. Please contact support with your reference ID.');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        }
      });

      rzp.open();
    } catch (err) {
      setIsProcessing(false);
      const message = err instanceof ApiError ? err.message : 'Something went wrong while booking. Please try again.';
      setError(message);
    }
  };

  if (!user) return null;

  // Fallback if accessed directly with no booking parameters
  if (!state && !confirmedBooking) {
    return (
      <div className="min-h-screen pt-40 pb-24 px-6 text-center max-w-md mx-auto font-sans">
        <div className="liquid-glass border border-white/10 rounded-2xl p-8 space-y-6">
          <AlertTriangle className="w-12 h-12 text-brand-yellow mx-auto" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold text-white">No Booking Initiated</h2>
          <p className="text-xs text-ink-secondary leading-relaxed">
            You reached the payment screen directly without initiating a reservation session.
          </p>
          <button
            onClick={() => navigate('/bookings')}
            className="w-full py-3 bg-white text-brand-navy hover:bg-white/95 text-[10px] font-sans font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer"
          >
            Start Booking Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pt-32 pb-24 px-6 md:px-12 max-w-xl mx-auto font-sans"
    >
      <div className="mb-8">
        {!confirmedBooking && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[10px] text-ink-secondary hover:text-white uppercase tracking-wider font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Scheduler
          </button>
        )}
      </div>

      {confirmedBooking ? (
        // CONFIRMED SCREEN
        <div className="liquid-glass border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl text-center space-y-6 animate-fade-rise">
          <div className="w-14 h-14 bg-white/10 text-white border border-white/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
            <Check className="w-7 h-7" strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="font-sans font-light text-2xl md:text-3xl text-white tracking-tight leading-tight">
              Booking Confirmed
            </h1>
            <p className="text-xs text-ink-secondary mt-1.5">
              Ref ID: <span className="font-mono font-bold text-brand-green">{confirmedBooking.id}</span>
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left space-y-3 font-sans">
            <div className="flex justify-between text-xs">
              <span className="text-ink-secondary">Venue:</span>
              <span className="font-semibold text-white">{selectedLocation?.name || confirmedBooking.locationId}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-secondary">Arena:</span>
              <span className="font-semibold text-white">{selectedTurf?.name.split(' (')[0]}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/5 pt-2.5">
              <span className="text-ink-secondary">Date:</span>
              <span className="font-semibold text-white">{confirmedBooking.date}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-secondary">Hourly Slot:</span>
              <span className="font-semibold text-white">{confirmedBooking.timeSlot}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-secondary">Duration:</span>
              <span className="font-semibold text-white">{confirmedBooking.duration} hour(s)</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/5 pt-2.5">
              <span className="text-ink-secondary">Amount ({confirmedBooking.paymentMethod}) · {confirmedBooking.paymentStatus}:</span>
              <span className="font-sans font-bold text-white text-base">₹{confirmedBooking.amount}</span>
            </div>
          </div>

          <p className="text-[10px] text-ink-secondary leading-relaxed px-4">
            A secure confirmation code has been registered in our systems. Please present Ref ID: <strong className="text-white font-sans">{confirmedBooking.id}</strong> at the ground entry counter.
          </p>

          <button
            onClick={() => navigate('/bookings')}
            className="w-full py-3.5 rounded-full bg-white text-brand-navy text-[10px] font-sans font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg hover:bg-white/95"
          >
            My Account & Bookings
          </button>
        </div>
      ) : (
        // FORM SCREEN
        <div className="liquid-glass border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="border-b border-white/5 pb-4 mb-5 text-center">
            <span className="text-[9px] font-sans font-semibold text-ink-secondary uppercase tracking-wider block">Step 2 of 2</span>
            <h2 className="font-sans font-light text-2xl text-white tracking-tight mt-1">Secure Checkout</h2>
          </div>

          <form onSubmit={handleConfirmBooking} className="space-y-6 text-left">
            {/* Summary block */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2.5 font-sans">
              <div className="flex justify-between text-xs">
                <span className="text-ink-secondary">Selected Turf:</span>
                <span className="font-semibold text-white">{selectedTurf?.name.split(' (')[0]}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-secondary">Location:</span>
                <span className="font-semibold text-white">{selectedLocation?.name}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                <span className="text-ink-secondary">Time & Date:</span>
                <span className="font-semibold text-white">{state!.date} @ {state!.timeSlot}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-secondary">Duration:</span>
                <span className="font-semibold text-white">{state!.duration} hour(s)</span>
              </div>
              <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                <span className="text-ink-secondary font-semibold">Total Amount:</span>
                <span className="font-sans font-bold text-white text-lg">₹{state!.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary pl-1">Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-ink-secondary uppercase tracking-wider pl-2 block font-semibold">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary/70">
                      <UserIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </span>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white font-sans focus:outline-none focus:border-white/20 placeholder:opacity-30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-ink-secondary uppercase tracking-wider pl-2 block font-semibold">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary/70">
                      <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </span>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="10-digit Phone"
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white font-sans focus:outline-none focus:border-white/20 placeholder:opacity-30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-2.5">
              <h4 className="text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary pl-1">Payment Method</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI' as PaymentMethod, label: 'UPI / QR' },
                  { id: 'Card' as PaymentMethod, label: 'Credit/Debit' },
                  { id: 'Cash' as PaymentMethod, label: 'At Ground' }
                ].map((p) => {
                  const isSel = paymentMethod === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPaymentMethod(p.id)}
                      className={`p-3 border rounded-xl text-center cursor-pointer transition-all duration-300 flex flex-col justify-center items-center gap-1.5
                        ${isSel
                          ? 'bg-white border-white text-brand-navy font-semibold scale-[1.02]'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                    >
                      <CreditCard className={`w-4 h-4 ${isSel ? 'text-brand-navy' : 'text-ink-secondary'}`} strokeWidth={1.5} />
                      <span className="text-[8px] font-sans font-semibold uppercase tracking-wide leading-none block">{p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 text-[10px] font-sans bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 space-y-2.5">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 rounded-full bg-white text-brand-navy text-[10px] font-sans font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:bg-white/95"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
                    Processing Secure {paymentMethod}...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-navy" strokeWidth={2.5} />
                    Pay & Confirm Booking
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-[8px] font-sans text-ink-secondary uppercase tracking-wide">
                  🔒 SECURE RAZORPAY TEST-MODE TRANSACTION
                </span>
              </div>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}
