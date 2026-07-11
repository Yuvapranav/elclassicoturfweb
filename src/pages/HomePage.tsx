import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TURF_LOCATIONS as FALLBACK_LOCATIONS } from '../utils/mockData';
import { TurfLocation } from '../types';
import { apiGet } from '../lib/api';
import { Star, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [TURF_LOCATIONS, setTurfLocations] = useState<TurfLocation[]>(FALLBACK_LOCATIONS);

  useEffect(() => {
    apiGet<TurfLocation[]>('/locations')
      .then((locs) => {
        if (locs && locs.length > 0) setTurfLocations(locs);
      })
      .catch(() => {
        // keep fallback marketing data if the API is unreachable
      });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-transparent text-white font-sans relative"
    >
      {/* 1. HERO SECTION */}
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

      {/* 2. VENUE TEASER STRIP */}
      <section id="features" className="py-24 px-6 md:px-12 bg-transparent border-t border-white/5">
        <div className="max-w-5xl mx-auto">

          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
              Active Venues
            </span>
            <h2 className="font-sans font-light text-white text-4xl md:text-5xl tracking-tight leading-tight mt-2">
              Four arenas. <span className="italic text-white font-normal">Endless matches.</span>
            </h2>
            <p className="text-xs text-ink-secondary mt-3 font-light max-w-md mx-auto leading-relaxed">
              Full specs, contact details, and amenities for each hub live on the arenas page.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TURF_LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                onClick={() => navigate('/locations')}
                className="p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <span className="text-[11px] font-sans font-semibold tracking-wide uppercase text-white">{loc.name.split(' (')[0]}</span>
                <span className="text-[9px] flex items-center gap-0.5 font-sans mt-0.5 text-ink-secondary">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {loc.rating}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/locations')}
              className="px-6 py-2.5 rounded-full border border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50 text-[9px] font-sans font-bold uppercase tracking-wide text-white transition-all duration-300 hover:scale-105 cursor-pointer inline-flex items-center gap-2"
            >
              View All Locations
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>

        </div>
      </section>

      {/* 3. FINAL CTA */}
      <section className="py-24 px-6 md:px-12 bg-transparent text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wide block">
            Squad ready?
          </span>
          <h2 className="font-sans font-light text-white text-4xl md:text-5xl tracking-tight leading-tight mt-2">
            Where dreams rise <span className="italic text-white font-normal">through the silence.</span>
          </h2>
          <p className="text-xs text-ink-secondary font-light max-w-md mx-auto leading-relaxed">
            Reserve your timing now. Instant booking reference generated. Zero reservation fees. Simulated payment processing.
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/bookings')}
              className="px-8 py-3.5 rounded-full bg-brand-green text-brand-navy text-[10px] font-mono font-bold tracking-[0.2em] uppercase hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              Start Scheduler
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
