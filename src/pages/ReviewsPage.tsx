import React from 'react';
import { motion } from 'motion/react';
import { REVIEWS } from '../utils/mockData';
import { Star } from 'lucide-react';

export default function ReviewsPage() {
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
          Player Reviews
        </span>
        <h1 className="font-sans font-light text-white text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight mt-2">
          What the <span className="italic text-white font-normal">squad says.</span>
        </h1>
        <p className="text-xs text-ink-secondary mt-3 font-light max-w-md mx-auto leading-relaxed">
          Real feedback from players across our four hubs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REVIEWS.map((review) => (
          <div
            key={review.id}
            className="liquid-glass border border-white/5 hover:border-white/20 p-6 rounded-2xl flex flex-col gap-4 transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className={`w-3.5 h-3.5 ${idx < review.rating ? 'text-brand-yellow fill-current' : 'text-white/15'}`}
                />
              ))}
            </div>

            <p className="text-[11px] text-white/90 leading-relaxed font-light flex-grow">
              "{review.comment}"
            </p>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs font-sans font-semibold text-white">{review.name}</span>
              <span className="text-[10px] font-sans text-ink-secondary">{review.date}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
