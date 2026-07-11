import React from 'react';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';
  
  return (
    <div className="select-none font-sans font-semibold tracking-tight text-white leading-none">
      <span className={`${isSmall ? 'text-lg' : isLarge ? 'text-3xl' : 'text-xl'}`}>
        El Clasico®
      </span>
    </div>
  );
}
