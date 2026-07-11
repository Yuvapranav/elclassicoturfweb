import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Booking, TurfType, TurfLocation, TurfConfig } from '../types';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import {
  TURF_CONFIGS,
  TURF_LOCATIONS,
  getTurfPriceForLocation,
  TIME_SLOTS,
  formatDateString
} from '../utils/mockData';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Check,
  Star,
  ShieldAlert,
  ChevronRight,
  ArrowRight,
  Trophy
} from 'lucide-react';

type LocationWithConfigs = TurfLocation & { turfConfigs: TurfConfig[] };

export default function BookingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location');

  // Redirect to login if logged out
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=bookings');
    }
  }, [user, navigate]);

  // Locations fetched from the API (used to resolve real turfConfigId values for booking)
  const [apiLocations, setApiLocations] = useState<LocationWithConfigs[]>([]);
  useEffect(() => {
    apiGet<LocationWithConfigs[]>('/locations')
      .then(setApiLocations)
      .catch(() => setApiLocations([]));
  }, []);

  // Booking states
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    locationParam && TURF_LOCATIONS.some(l => l.id === locationParam)
      ? locationParam
      : 'potheri'
  );
  const [selectedTurf, setSelectedTurf] = useState<TurfType>('5-a-side');
  const [selectedDate, setSelectedDate] = useState<string>(formatDateString(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [duration, setDuration] = useState<number>(1);

  // Booked slots for the current location/turf/date, sourced from the server
  const [bookedSlotsOnSelectedDate, setBookedSlotsOnSelectedDate] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // My booking history, sourced from the server
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  useEffect(() => {
    if (!user) return;
    apiGet<Booking[]>('/bookings/mine')
      .then(setMyBookings)
      .catch(() => setMyBookings([]));
  }, [user]);

  // Sync with search param if it changes
  useEffect(() => {
    if (locationParam && TURF_LOCATIONS.some(l => l.id === locationParam)) {
      setSelectedLocationId(locationParam);
      setSelectedSlot('');
    }
  }, [locationParam]);

  // Resolve the real turfConfigId (cuid) matching the selected location + turf type
  const selectedTurfConfigId = useMemo(() => {
    const loc = apiLocations.find(l => l.id === selectedLocationId);
    return loc?.turfConfigs.find(tc => tc.id === selectedTurf || (tc as any).type === selectedTurf)?.id;
  }, [apiLocations, selectedLocationId, selectedTurf]);

  // Fetch availability whenever the combo changes
  useEffect(() => {
    if (!selectedTurfConfigId) {
      setBookedSlotsOnSelectedDate([]);
      return;
    }
    setSlotsLoading(true);
    apiGet<{ bookedSlots: string[] }>(
      `/bookings/availability?locationId=${encodeURIComponent(selectedLocationId)}&turfConfigId=${encodeURIComponent(selectedTurfConfigId)}&date=${encodeURIComponent(selectedDate)}`
    )
      .then((res) => setBookedSlotsOnSelectedDate(res.bookedSlots))
      .catch(() => setBookedSlotsOnSelectedDate([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedTurfConfigId, selectedLocationId, selectedDate]);

  // Quick Date Selectors
  const quickDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;

      let label = '';
      if (isToday) label = 'Today';
      else if (isTomorrow) label = 'Tomorrow';
      else {
        label = nextDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      }

      dates.push({
        dateStr: formatDateString(nextDate),
        label
      });
    }
    return dates;
  }, []);

  const selectedTurfConfig = useMemo(() => {
    return TURF_CONFIGS.find(t => t.id === selectedTurf)!;
  }, [selectedTurf]);

  const pricePerHourForLocation = useMemo(() => {
    return getTurfPriceForLocation(selectedTurf, selectedLocationId);
  }, [selectedTurf, selectedLocationId]);

  const totalPrice = useMemo(() => {
    return pricePerHourForLocation * duration;
  }, [pricePerHourForLocation, duration]);

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const todayStr = formatDateString(new Date());
    const upcoming = myBookings.filter(b => b.date >= todayStr);
    const past = myBookings.filter(b => b.date < todayStr);
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [myBookings]);

  const handleSlotClick = (slot: string) => {
    if (bookedSlotsOnSelectedDate.includes(slot)) return;
    setSelectedSlot(slot);
  };

  const handleProceedToPayment = () => {
    if (!selectedSlot || !selectedTurfConfigId) return;
    // Pass booking parameters via router state to payment page
    navigate('/bookings/payment', {
      state: {
        locationId: selectedLocationId,
        turfConfigId: selectedTurfConfigId,
        turfType: selectedTurf,
        date: selectedDate,
        timeSlot: selectedSlot,
        duration: duration,
        amount: totalPrice
      }
    });
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto text-left"
    >
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
          Scheduler
        </span>
        <h1 className="font-sans font-light text-white text-4xl md:text-5xl tracking-tight leading-tight mt-2">
          Reserve your <span className="italic text-white font-normal">timing.</span>
        </h1>
        <p className="text-xs text-ink-secondary mt-3 font-light max-w-md mx-auto leading-relaxed">
          Select venue, choose turf size, and pick an hourly slot. Instant confirmation reference generated.
        </p>
      </div>

      {/* 1. SCHEDULER BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Location, Turf, Date */}
        <div className="lg:col-span-5 space-y-8">

          {/* Location Selector */}
          <div className="space-y-3">
            <label className="block text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary ml-1">
              1. Select Arena Location
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TURF_LOCATIONS.map((loc) => {
                const isSelected = selectedLocationId === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setSelectedLocationId(loc.id);
                      setSelectedSlot('');
                    }}
                    className={`p-3 rounded-xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1
                      ${isSelected
                        ? 'bg-white border-white text-brand-navy shadow-lg scale-[1.02]'
                        : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
                  >
                    <span className="text-[10px] font-semibold tracking-wide uppercase truncate max-w-full">
                      {loc.name.split(' (')[0]}
                    </span>
                    <span className={`text-[8px] flex items-center gap-0.5 mt-0.5 ${isSelected ? 'text-brand-navy/80' : 'text-ink-secondary'}`}>
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {loc.rating}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Turf Selection */}
          <div className="space-y-3">
            <label className="block text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary ml-1">
              2. Choose Turf Size
            </label>
            <div className="space-y-2.5">
              {TURF_CONFIGS.map((t) => {
                const isSelected = selectedTurf === t.id;
                const dynamicPrice = getTurfPriceForLocation(t.id, selectedLocationId);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTurf(t.id);
                      setSelectedSlot('');
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-300 flex items-center gap-4 hover:scale-[1.01]
                      ${isSelected
                        ? 'bg-white/5 border-white shadow-md'
                        : 'liquid-glass border-white/10 hover:border-white/20'}`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 grayscale">
                      <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{t.name.split(' (')[0]}</h4>
                      <p className="text-[10px] font-sans text-brand-green mt-0.5">₹{dynamicPrice} / hr</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all
                      ${isSelected ? 'border-white bg-white text-brand-navy' : 'border-white/20'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-brand-navy" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-3">
            <label className="block text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary ml-1">
              3. Select Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {quickDates.map((q) => {
                const isSelected = selectedDate === q.dateStr;
                return (
                  <button
                    key={q.dateStr}
                    onClick={() => {
                      setSelectedDate(q.dateStr);
                      setSelectedSlot('');
                    }}
                    className={`px-3.5 py-2 rounded-full text-[9px] font-sans uppercase tracking-wide whitespace-nowrap border flex-shrink-0 transition-all duration-300 cursor-pointer
                      ${isSelected
                        ? 'bg-white border-white text-brand-navy font-bold'
                        : 'liquid-glass border-white/10 text-white hover:border-white/25'}`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary">
                <CalendarIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setSelectedSlot('');
                  }
                }}
                min={formatDateString(new Date())}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs text-white focus:outline-none focus:border-white/20 font-sans cursor-pointer"
              />
            </div>
          </div>

          {/* Summary Card when slot selected */}
          {selectedSlot && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4 animate-fade-rise duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[8px] font-sans uppercase tracking-wider text-ink-secondary">Session Config</h4>
                  <div className="text-xs font-semibold text-white mt-0.5">{selectedTurfConfig.name.split(' (')[0]}</div>
                </div>
                <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-sans text-brand-green font-medium">
                  ₹{pricePerHourForLocation}/hr
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3 text-xs">
                <div>
                  <span className="text-[8px] font-sans uppercase tracking-wider text-ink-secondary">Timing</span>
                  <p className="text-[10px] font-medium text-white font-sans mt-0.5">{selectedDate} <br/> {selectedSlot}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-sans uppercase tracking-wider text-ink-secondary block">Duration</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDuration(prev => Math.max(1, prev - 1))}
                      className="w-6 h-6 rounded-full border border-white/15 bg-white/5 flex items-center justify-center hover:bg-white/10 text-xs text-white cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-sans text-[11px] font-bold w-4 text-center text-white">{duration}h</span>
                    <button
                      onClick={() => setDuration(prev => Math.min(4, prev + 1))}
                      className="w-6 h-6 rounded-full border border-white/15 bg-white/5 flex items-center justify-center hover:bg-white/10 text-xs text-white cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-sans uppercase tracking-wider text-ink-secondary block">Estimated Total</span>
                  <span className="text-lg font-sans font-light text-white">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={!selectedTurfConfigId}
                  className="px-5 py-2 bg-white text-brand-navy text-[9px] font-sans font-bold tracking-wide uppercase rounded-full hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center gap-1 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Timing
                  <ChevronRight className="w-3.5 h-3.5 text-brand-navy" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Slot Selection */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <label className="block text-[9px] font-sans uppercase tracking-wider text-ink-secondary">
              4. Choose Hourly Slot ({selectedDate}) {slotsLoading && '· loading…'}
            </label>

            <div className="flex gap-4 font-sans text-[9px] text-ink-secondary">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/10 border border-white/20" />
                Free
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400/30" />
                Booked
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isBooked = bookedSlotsOnSelectedDate.includes(slot);
              const isSelected = selectedSlot === slot;

              return (
                <button
                  key={slot}
                  disabled={isBooked}
                  onClick={() => handleSlotClick(slot)}
                  className={`py-2 px-3 rounded-full text-[11px] font-sans border text-center transition-all duration-300 cursor-pointer flex flex-col justify-center items-center gap-0.5 relative overflow-hidden
                    ${isBooked
                      ? 'border-white/5 text-ink-secondary/20 bg-white/5 opacity-30 cursor-not-allowed'
                      : isSelected
                        ? 'bg-white border-white text-brand-navy font-semibold scale-[0.98]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-white hover:bg-white/10'}`}
                >
                  <span>{slot}</span>
                  <span className={`text-[7px] font-sans tracking-wide uppercase
                    ${isSelected ? 'text-brand-navy/80 font-bold' : isBooked ? 'text-ink-secondary/20' : 'text-white/40'}`}>
                    {isBooked ? 'Booked' : isSelected ? 'Selected' : 'Available'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-4 liquid-glass rounded-2xl flex gap-3 items-start text-left">
            <ShieldAlert className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-[10px] leading-relaxed text-ink-secondary">
              <strong className="text-white">Notice:</strong> Peak evening slots (17:00 onwards) fill up fast. Please note booking cancellations/modifications require at least 4 hours notice.
            </p>
          </div>
        </div>
      </div>

      {/* 2. HISTORY LIST (UPCOMING & PAST) */}
      <div className="mt-20 space-y-8 pt-12 border-t border-white/5">
        <div>
          <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
            Account Center
          </span>
          <h2 className="font-sans font-light text-white text-3xl tracking-tight leading-tight mt-1">
            My Booking <span className="italic text-white font-normal">History</span>
          </h2>
        </div>

        {/* Upcoming Bookings */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-white tracking-wider uppercase border-l-2 border-brand-green pl-3">
            Upcoming Bookings
          </h3>

          {upcomingBookings.length === 0 ? (
            <div className="p-8 text-center bg-white/5 border border-white/5 rounded-2xl text-xs text-ink-secondary font-light">
              No upcoming sessions reserved. Click an arena slot above to lock down your game!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingBookings.map((b) => {
                const locObj = TURF_LOCATIONS.find(l => l.id === b.locationId);
                return (
                  <div key={b.id} className="p-4 liquid-glass border border-white/10 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[8px] font-mono uppercase tracking-widest text-ink-secondary">Ref: {b.id}</span>
                        <h4 className="text-sm font-semibold text-white mt-0.5">{locObj?.name || b.locationId}</h4>
                        <p className="text-[10px] text-ink-secondary font-sans mt-1">{TURF_CONFIGS.find(t => t.id === b.turfType)?.name.split(' (')[0]}</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-brand-green/10 border border-brand-green/20 rounded-full text-[8px] font-sans font-semibold uppercase tracking-wider text-brand-green">
                        {b.status}
                      </span>
                    </div>

                    <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs">
                      <div className="space-y-0.5 font-sans">
                        <p className="text-[10px] text-ink-secondary">Date & Time</p>
                        <p className="text-[10px] font-medium text-white">{b.date} @ {b.timeSlot}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] text-ink-secondary">{b.paymentStatus} ({b.paymentMethod})</p>
                        <p className="text-sm font-semibold text-white">₹{b.amount}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Bookings */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xs font-semibold text-white tracking-wider uppercase border-l-2 border-white/20 pl-3">
            Past Sessions
          </h3>

          {pastBookings.length === 0 ? (
            <div className="p-6 text-center bg-white/5 border border-white/5 rounded-2xl text-[11px] text-ink-secondary font-light">
              No historical games recorded.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pastBookings.map((b) => {
                const locObj = TURF_LOCATIONS.find(l => l.id === b.locationId);
                return (
                  <div key={b.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Trophy className="w-4 h-4 text-ink-secondary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-white">{locObj?.name || b.locationId}</h4>
                          <span className="text-[8px] font-mono text-ink-secondary/70">Ref: {b.id}</span>
                        </div>
                        <p className="text-[9px] text-ink-secondary mt-0.5">
                          {TURF_CONFIGS.find(t => t.id === b.turfType)?.name.split(' (')[0]} • {b.duration}h
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:items-center justify-between sm:justify-end gap-6">
                      <div className="text-left sm:text-right font-sans">
                        <p className="text-[9px] text-ink-secondary">Date & Time</p>
                        <p className="text-[10px] text-white/90">{b.date} @ {b.timeSlot}</p>
                      </div>
                      <div className="text-right font-sans min-w-[70px]">
                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-[8px] text-ink-secondary font-semibold uppercase tracking-wider block text-center mb-1">
                          {b.status}
                        </span>
                        <p className="text-xs font-semibold text-white">₹{b.amount}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
