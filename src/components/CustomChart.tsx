import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Booking } from '../types';
import { formatDateString } from '../utils/mockData';

interface CustomChartProps {
  bookings: Booking[];
}

export default function CustomChart({ bookings }: CustomChartProps) {
  const [daysCount, setDaysCount] = useState<7 | 30>(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 280 });

  // Handle resizing of parent container dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // enforce some reasonable defaults
      setDimensions({
        width: Math.max(width, 300),
        height: 280
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute daily revenue data
  const chartData = useMemo(() => {
    const data: { date: string; displayDate: string; revenue: number }[] = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateStr = formatDateString(targetDate);

      // Sum revenue for confirmed/completed bookings on this date
      const daysRevenue = bookings
        .filter(b => b.date === dateStr && b.status !== 'Cancelled' && b.paymentStatus === 'Paid')
        .reduce((sum, b) => sum + b.amount, 0);

      // Display format (e.g. "Jul 05")
      const displayDate = targetDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      data.push({
        date: dateStr,
        displayDate,
        revenue: daysRevenue
      });
    }

    return data;
  }, [bookings, daysCount]);

  // Max revenue for scaling
  const maxRevenue = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.revenue), 1000);
    // Round to nearest neat number
    return Math.ceil(maxVal / 2000) * 2000;
  }, [chartData]);

  // SVG Coordinates calculations
  const padding = { top: 30, right: 20, bottom: 40, left: 55 };
  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    
    return chartData.map((d, index) => {
      const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
      const ratio = d.revenue / maxRevenue;
      const y = padding.top + chartHeight - ratio * chartHeight;
      return { x, y, ...d };
    });
  }, [chartData, chartWidth, chartHeight, maxRevenue, padding.left, padding.top]);

  // SVG Path generation
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  // SVG Area path generation
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const start = `M ${points[0].x} ${padding.top + chartHeight}`;
    const middle = points.map(p => `L ${p.x} ${p.y}`).join(' ');
    const end = `L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;
    return `${start} ${middle} ${end}`;
  }, [points, chartHeight, padding.top]);

  return (
    <div className="w-full flex flex-col" ref={containerRef}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6 font-sans">
        <div>
          <span className="text-xs font-sans font-semibold text-ink-secondary uppercase tracking-wide">
            Revenue Analytics
          </span>
          <h3 className="font-sans font-semibold text-xl text-ink-primary mt-1">
            Historical Inflow
          </h3>
        </div>

        {/* Period Selector Toggle */}
        <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
          <button
            onClick={() => setDaysCount(7)}
            className={`px-4 py-1 text-[11px] font-sans font-bold tracking-wide uppercase rounded-full transition-all duration-300 cursor-pointer
              ${daysCount === 7 
                ? 'bg-white text-brand-navy shadow-sm' 
                : 'text-ink-secondary hover:text-white'}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDaysCount(30)}
            className={`px-4 py-1 text-[11px] font-sans font-bold tracking-wide uppercase rounded-full transition-all duration-300 cursor-pointer
              ${daysCount === 30 
                ? 'bg-white text-brand-navy shadow-sm' 
                : 'text-ink-secondary hover:text-white'}`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* SVG Plot Arena */}
      <div className="relative bg-[#121317]/40 border border-white/10 rounded-2xl p-2 select-none overflow-visible">
        <svg 
          width={dimensions.width} 
          height={dimensions.height} 
          className="overflow-visible"
        >
          {/* Definitions for gradients */}
          <defs>
            {/* Elegant high-contrast white-to-gray gradient */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#888888" />
            </linearGradient>

            {/* Fade fill gradient for area */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (Y axis horizontal guidelines) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + chartHeight * ratio;
            const value = Math.round(maxRevenue * (1 - ratio));
            return (
              <g key={i} className="opacity-30">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={dimensions.width - padding.right}
                  y2={y}
                  stroke="#444444"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="font-sans text-[10px] fill-white/60 font-medium"
                >
                  ₹{value.toLocaleString('en-IN')}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          {points.length > 0 && (
            <path
              d={areaPath}
              fill="url(#areaGradient)"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* The primary line stroke */}
          {points.length > 0 && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#chartGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* Interaction Guide Vertical lines + Tooltip Anchors */}
          {points.map((p, index) => {
            // Only draw vertical guidelines for hovered item, or periodic values in 30d
            const shouldDrawLine = hoveredIndex === index;
            const isLabelVisible = daysCount === 7 || index % 4 === 0 || index === points.length - 1;

            return (
              <g key={index} className="overflow-visible font-sans">
                {/* Hover line */}
                {shouldDrawLine && (
                  <line
                    x1={p.x}
                    y1={padding.top}
                    x2={p.x}
                    y2={padding.top + chartHeight}
                    stroke="#555555"
                    strokeWidth="1.2"
                  />
                )}

                {/* X axis labels */}
                {isLabelVisible && (
                  <text
                    x={p.x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    className="font-sans text-[9px] fill-white/60 font-medium"
                  >
                    {p.displayDate}
                  </text>
                )}

                {/* Interactive Hit Area (circles) */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIndex === index ? 6 : 4}
                  fill={hoveredIndex === index ? '#121317' : 'url(#chartGradient)'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Floating HTML Tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute pointer-events-none bg-[#1a1b1f] border border-white/10 px-3 py-2 rounded-xl shadow-md z-10 text-left animate-in fade-in duration-200 font-sans"
            style={{
              left: `${points[hoveredIndex].x - 60}px`,
              top: `${points[hoveredIndex].y - 55}px`
            }}
          >
            <div className="text-[9px] font-sans font-semibold uppercase text-white/50 leading-none">
              {points[hoveredIndex].displayDate}
            </div>
            <div className="text-xs font-semibold text-white mt-1">
              ₹{points[hoveredIndex].revenue.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>

      {/* Legend details */}
      <div className="flex items-center gap-4 mt-4 font-sans text-[10px] text-ink-secondary/80 justify-end font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white border border-white/10" />
          <span>Realized Bookings Inflow</span>
        </div>
      </div>
    </div>
  );
}
