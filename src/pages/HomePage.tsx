import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-transparent text-white font-sans relative"
    >
      {/* HERO SECTION */}
      <section id="hero" className="relative min-h-[95vh] flex flex-col justify-center items-center px-6 md:px-12 lg:px-24 overflow-hidden pt-36 pb-24 text-center">
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center space-y-10 relative z-10 animate-fade-rise">

          {/* Headline */}
          <h1 className="font-sans font-light text-white tracking-tight leading-[1.05] text-5xl md:text-7xl lg:text-8xl max-w-3xl">
            Redefining the <br />
            <span className="italic font-normal text-brand-green">beautiful</span> game.
          </h1>

          {/* Description */}
          <p className="text-xs md:text-sm text-ink-secondary tracking-wide font-light max-w-xl leading-relaxed mx-auto">
            Experience the city's finest FIFA-approved multi-sport turf arena. Custom-crafted for ultimate grip, bright broadcast-grade lighting, and premium spectator facilities.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <button
              onClick={() => navigate('/bookings')}
              className="px-8 py-3.5 rounded-full bg-white text-brand-navy text-[10px] font-sans font-bold tracking-wider uppercase hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center gap-2 shadow-lg hover:bg-white/95"
            >
              Book now
              <ArrowRight className="w-3.5 h-3.5 text-brand-navy" strokeWidth={2} />
            </button>

            <button
              onClick={() => navigate('/locations')}
              className="px-8 py-3.5 rounded-full border border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50 text-[10px] font-sans font-bold tracking-wider uppercase text-white hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              Explore Arenas
            </button>
          </div>

          {/* Metrics Block */}
          <div className="mt-16 flex flex-wrap gap-8 md:gap-16 justify-center items-center py-8 border-y border-white/5 w-full max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl md:text-5xl font-sans font-light tracking-tight text-white">4.9</span>
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-ink-secondary">Avg Rating</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl md:text-5xl font-sans font-light tracking-tight text-white">12k+</span>
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-ink-secondary">Bookings</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl md:text-5xl font-sans font-light tracking-tight text-white">4</span>
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-ink-secondary">Active Hubs</span>
            </div>
          </div>

        </div>
      </section>
    </motion.div>
  );
}
