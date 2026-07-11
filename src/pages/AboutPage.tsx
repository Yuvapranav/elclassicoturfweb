import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Sun, Users, ShieldCheck } from 'lucide-react';

const VALUES = [
  {
    icon: Trophy,
    title: 'FIFA-grade turf',
    description: 'Premium artificial turf with high-quality shock absorption, chosen for true ball roll and consistent grip across every hub.',
  },
  {
    icon: Sun,
    title: 'Play any hour',
    description: 'Broadcast-grade floodlights and 24/7 access mean a 2am box cricket game is just as easy to book as a Sunday morning match.',
  },
  {
    icon: Users,
    title: 'Built for teams',
    description: 'Dugouts, spectator seating, locker rooms, and equipment on hand — because a good ground is more than just grass.',
  },
  {
    icon: ShieldCheck,
    title: 'No surprises at the gate',
    description: 'Instant booking confirmations and transparent per-hour pricing, so the slot you booked is the slot you get.',
  },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto text-left"
    >
      {/* Intro */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
          Our Story
        </span>
        <h1 className="font-sans font-light text-white text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight mt-2">
          Started on one ground. <span className="italic text-white font-normal">Never left the pitch.</span>
        </h1>
        <p className="text-xs text-ink-secondary mt-3 font-light max-w-xl mx-auto leading-relaxed">
          El Classico Turf began with a single ground in Potheri, built by a group of weekend
          footballers tired of chasing inconsistent turf quality and unreliable bookings across
          the city. Four hubs later — Potheri, Chengalpattu, Selaiyur/Tambaram, and Porur — the
          goal hasn't changed: a properly maintained pitch, honest pricing, and a booking that
          just works.
        </p>
      </div>

      {/* Values grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <div
              key={value.title}
              className="liquid-glass border border-white/5 hover:border-white/20 p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-brand-green" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-sans font-semibold text-white">{value.title}</h3>
                <p className="text-[11px] text-ink-secondary mt-1.5 font-light leading-relaxed">
                  {value.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="text-center max-w-lg mx-auto space-y-5">
        <h2 className="font-sans font-light text-white text-2xl md:text-3xl tracking-tight leading-tight">
          Come see the <span className="italic text-white font-normal">pitch</span> for yourself.
        </h2>
        <button
          onClick={() => navigate('/locations')}
          className="px-8 py-3.5 rounded-full bg-white text-brand-navy text-[10px] font-sans font-bold tracking-wider uppercase hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shadow-lg hover:bg-white/95"
        >
          View Our Hubs
        </button>
      </div>
    </motion.div>
  );
}
