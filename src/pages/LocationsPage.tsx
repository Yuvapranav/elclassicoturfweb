import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TURF_LOCATIONS as FALLBACK_LOCATIONS } from '../utils/mockData';
import { TurfLocation } from '../types';
import { apiGet } from '../lib/api';
import { Star, MapPin, Phone, Clock } from 'lucide-react';

export default function LocationsPage() {
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto text-left"
    >
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-[10px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
          Our Arenas
        </span>
        <h1 className="font-sans font-light text-white text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight mt-2">
          Choose your <span className="italic text-white font-normal">battleground.</span>
        </h1>
        <p className="text-xs text-ink-secondary mt-3 font-light max-w-md mx-auto leading-relaxed">
          Four elite venues meticulously designed for optimal performance, open 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {TURF_LOCATIONS.map((loc) => (
          <div
            key={loc.id}
            className="liquid-glass border border-white/5 hover:border-white/20 p-6 rounded-2xl flex flex-col justify-between gap-6 transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="space-y-4">
              {/* Header Info */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-sans font-semibold text-white tracking-tight">
                    {loc.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-ink-secondary mt-1 font-sans">
                    <Star className="w-3.5 h-3.5 text-brand-yellow fill-current" />
                    <span className="text-white font-semibold">{loc.rating}</span>
                    <span>({loc.reviewsCount} reviews)</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-sans text-white font-semibold">
                  {loc.price}
                </div>
              </div>

              {/* Specs List */}
              <div className="space-y-3 pt-4 border-t border-white/5 font-sans">
                <div className="flex items-start gap-3 text-xs">
                  <MapPin className="w-4 h-4 text-white/55 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="text-[10px] font-semibold text-ink-secondary uppercase block tracking-wider">Address</span>
                    <p className="text-[11px] text-white/90 leading-relaxed mt-0.5 font-light">{loc.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <Clock className="w-4 h-4 text-white/55 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="text-[10px] font-semibold text-ink-secondary uppercase block tracking-wider">Operating Hours</span>
                    <p className="text-[11px] text-white/90 leading-relaxed mt-0.5 font-light">{loc.hours}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <Phone className="w-4 h-4 text-white/55 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="text-[10px] font-semibold text-ink-secondary uppercase block tracking-wider">Phone Number</span>
                    <p className="text-[11px] text-white/90 mt-0.5 font-light">
                      {loc.phone === 'Not listed on Maps' ? 'Via Instagram' : loc.phone}
                    </p>
                  </div>
                </div>

                {/* Amenities */}
                <div className="pt-2">
                  <span className="text-[10px] font-semibold text-ink-secondary uppercase block tracking-wider mb-1.5">Amenities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {loc.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] font-sans font-medium text-white/70"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate(`/bookings?location=${loc.id}`)}
              className="w-full py-3 bg-white text-brand-navy hover:bg-white/95 text-[10px] font-sans font-bold uppercase tracking-wider rounded-full transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
            >
              Book This Location
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
