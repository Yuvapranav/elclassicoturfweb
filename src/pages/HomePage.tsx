import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TURF_LOCATIONS as FALLBACK_LOCATIONS } from '../utils/mockData';
import { TurfLocation } from '../types';
import { apiGet } from '../lib/api';
import Logo from '../components/Logo';
import { 
  MapPin, 
  Phone, 
  Sun, 
  Car, 
  Droplet, 
  Sofa, 
  ShowerHead, 
  Trophy, 
  Star,
  Compass, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('potheri');
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

  const selectedLocationObj = useMemo(() => {
    return TURF_LOCATIONS.find(loc => loc.id === selectedLocationId) || TURF_LOCATIONS[0];
  }, [selectedLocationId, TURF_LOCATIONS]);

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

      {/* 2. VENUE SPECIFICATIONS & INTERACTIVE MOCK MAP */}
      <section id="features" className="py-24 px-6 md:px-12 bg-transparent border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
              Active Venues
            </span>
            <h2 className="font-sans font-light text-white text-4xl md:text-5xl tracking-tight leading-tight mt-2">
              Four arenas. <span className="italic text-white font-normal">Endless matches.</span>
            </h2>
            <p className="text-xs text-ink-secondary mt-3 font-light max-w-md mx-auto leading-relaxed">
              Explore the individual features, contact details, and custom amenities provided across our prime city hubs.
            </p>

            {/* Quick Branch Selector Tabs */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 p-2 rounded-3xl border border-white/5">
              {TURF_LOCATIONS.map((loc) => {
                const isSelected = selectedLocationId === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`p-3.5 rounded-2xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1
                      ${isSelected 
                        ? 'bg-white border-white text-brand-navy shadow-lg shadow-white/10 scale-[1.02]' 
                        : 'bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/15'}`}
                  >
                    <span className="text-[11px] font-sans font-semibold tracking-wide uppercase">{loc.name.split(' (')[0]}</span>
                    <span className={`text-[9px] flex items-center gap-0.5 font-sans mt-0.5 ${isSelected ? 'text-brand-navy/80' : 'text-ink-secondary'}`}>
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {loc.rating}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Specs detail left */}
            <div className="lg:col-span-5 space-y-6 text-left font-sans">
              <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wider">
                Venue Specs
              </span>
              <h3 className="font-sans font-light text-white text-3xl tracking-tight leading-tight mt-2">
                {selectedLocationObj.name}. <span className="italic text-white font-normal">Active Ground.</span>
              </h3>
              
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-white/75 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <h5 className="text-xs font-semibold text-white">Address</h5>
                    <p className="text-[11px] text-ink-secondary mt-1 font-light leading-relaxed">
                      {selectedLocationObj.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Compass className="w-5 h-5 text-white/75 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <h5 className="text-xs font-semibold text-white">Key Landmarks</h5>
                    <p className="text-[11px] text-ink-secondary mt-1 font-light leading-relaxed">
                      {selectedLocationObj.landmarks}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-white/75 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <h5 className="text-xs font-semibold text-white">Contact & Hours</h5>
                    <p className="text-[11px] text-ink-secondary mt-1 font-sans">
                      Phone: {selectedLocationObj.phone === 'Not listed on Maps' ? 'Via Instagram' : selectedLocationObj.phone}
                    </p>
                    <p className="text-[10px] font-sans text-white/90 mt-0.5">
                      Hours: {selectedLocationObj.hours}
                    </p>
                  </div>
                </div>

                {/* Amenities */}
                <div className="pt-2">
                  <h5 className="text-xs font-semibold text-white mb-2">Amenities Provided</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLocationObj.amenities.map((amenity, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] font-sans font-medium text-ink-secondary">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => navigate(`/bookings?location=${selectedLocationId}`)}
                  className="px-6 py-2.5 rounded-full bg-white text-brand-navy text-[9px] font-sans font-bold uppercase tracking-wide transition-all duration-300 hover:scale-105 cursor-pointer shadow-lg hover:bg-white/95"
                >
                  Book This Location
                </button>
              </div>
            </div>

            {/* Simulated Map right */}
            <div className="lg:col-span-7">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 p-2 liquid-glass">
                <div className="absolute inset-0 bg-[#07131d] flex flex-col items-center justify-center p-6 text-center">
                  
                  {/* Styled Map Graphics Mock */}
                  <div className="absolute inset-0 opacity-[0.25]" 
                       style={{ 
                         backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', 
                         backgroundSize: '16px 16px' 
                       }} 
                   />
                  
                  {/* Map Roads lines mock */}
                  <div className="absolute w-full h-[2px] bg-white/5 top-1/3 left-0 transform -rotate-12" />
                  <div className="absolute w-[2px] h-full bg-white/5 left-1/4 top-0 transform rotate-45" />
                  <div className="absolute w-[2px] h-full bg-white/5 right-1/3 top-0" />
                  
                  {/* Floating map pin icon */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-brand-green border border-brand-navy flex items-center justify-center shadow-lg animate-bounce duration-1000">
                      <span className="text-[10px] font-bold text-brand-navy font-mono">MAP</span>
                    </div>
                    <div className="mt-3 bg-[#0a1e2c] border border-white/10 rounded-2xl p-3 shadow-md max-w-xs">
                      <h4 className="text-xs font-semibold text-white">{selectedLocationObj.name}</h4>
                      <p className="text-[9px] font-mono text-ink-secondary mt-0.5 truncate">{selectedLocationObj.address}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
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
