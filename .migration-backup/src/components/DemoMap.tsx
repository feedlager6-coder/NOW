'use client';

import React from 'react';
import { AnonymousDiscoveryCard } from '@/domain/safety-guard';

// TODO: Before using OSM-derived map tiles or objects in production, implement required attribution and review ODbL/provider terms.

interface DemoMapProps {
  meetups: AnonymousDiscoveryCard[];
  selectedMeetupId?: string;
  onSelectMeetup: (meetupId: string) => void;
}

// Minimalist abstract district anchor coordinates on a 390x210 canvas
const ZONE_ANCHORS: Record<string, { cx: number; cy: number }> = {
  DEMO_ZONE_NORTH: { cx: 195, cy: 45 },
  DEMO_ZONE_CENTER: { cx: 195, cy: 110 },
  DEMO_ZONE_PARK: { cx: 305, cy: 80 },
  DEMO_ZONE_RIVER: { cx: 85, cy: 155 },
  DEMO_ZONE_SPORT: { cx: 300, cy: 165 },
};

const ACTIVITY_PALETTE: Record<string, { fill: string; border: string; glow: string; text: string }> = {
  walking: { fill: '#10B981', border: '#6EE7B7', glow: 'rgba(16, 185, 129, 0.6)', text: '#FFFFFF' },
  coffee: { fill: '#F59E0B', border: '#FCD34D', glow: 'rgba(245, 158, 11, 0.6)', text: '#FFFFFF' },
  football: { fill: '#06B6D4', border: '#67E8F9', glow: 'rgba(6, 182, 212, 0.6)', text: '#FFFFFF' },
  sports_viewing: { fill: '#8B5CF6', border: '#C4B5FD', glow: 'rgba(139, 92, 246, 0.6)', text: '#FFFFFF' },
  board_games: { fill: '#EC4899', border: '#F472B6', glow: 'rgba(236, 72, 153, 0.6)', text: '#FFFFFF' },
  study: { fill: '#3B82F6', border: '#93C5FD', glow: 'rgba(59, 130, 246, 0.6)', text: '#FFFFFF' },
  workout: { fill: '#EF4444', border: '#FCA5A5', glow: 'rgba(239, 68, 68, 0.6)', text: '#FFFFFF' },
};

export const DemoMap: React.FC<DemoMapProps> = ({
  meetups,
  selectedMeetupId,
  onSelectMeetup,
}) => {
  // Compute non-overlapping marker coordinates per zone using polar distribution
  const zoneBuckets: Record<string, AnonymousDiscoveryCard[]> = {};
  for (const m of meetups) {
    if (!zoneBuckets[m.zoneId]) {
      zoneBuckets[m.zoneId] = [];
    }
    zoneBuckets[m.zoneId].push(m);
  }

  const markerPositions: Array<{
    meetup: AnonymousDiscoveryCard;
    x: number;
    y: number;
    isSelected: boolean;
  }> = [];

  for (const [zoneId, list] of Object.entries(zoneBuckets)) {
    const anchor = ZONE_ANCHORS[zoneId] || { cx: 195, cy: 110 };
    const count = list.length;
    const radius = count > 1 ? 26 : 0;

    list.forEach((meetup, idx) => {
      let x = anchor.cx;
      let y = anchor.cy;
      if (count > 1) {
        const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
        x = Math.round(anchor.cx + radius * Math.cos(angle));
        y = Math.round(anchor.cy + radius * Math.sin(angle));
      }

      // Clamp to SVG bounding box
      x = Math.max(28, Math.min(362, x));
      y = Math.max(30, Math.min(185, y));

      markerPositions.push({
        meetup,
        x,
        y,
        isSelected: meetup.id === selectedMeetupId,
      });
    });
  }

  // Sort so selected marker is rendered on top
  markerPositions.sort((a, b) => (a.isSelected ? 1 : 0) - (b.isSelected ? 1 : 0));

  return (
    <div className="w-full relative rounded-2xl overflow-hidden bg-[#0A0E17] border border-slate-800/80 shadow-xl mb-4 select-none">
      {/* Small, subtle DEMO MAP badge */}
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 backdrop-blur text-[9px] font-bold text-slate-400 tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span>DEMO MAP</span>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 390 210"
        className="w-full h-auto block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="dotGrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="0.8" fill="#334155" opacity="0.3" />
          </pattern>
        </defs>

        {/* Minimal Dark Background & Dot Grid */}
        <rect width="390" height="210" fill="#0A0E17" />
        <rect width="390" height="210" fill="url(#dotGrid)" />

        {/* Soft Minimal District Contours (Quiet geometry) */}
        <g opacity="0.4">
          {/* North block */}
          <rect x="140" y="20" width="110" height="48" rx="14" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
          {/* Center block */}
          <rect x="135" y="80" width="120" height="60" rx="16" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
          {/* Park block */}
          <ellipse cx="305" cy="80" rx="55" ry="35" fill="#062E23" fillOpacity="0.4" stroke="#064E3B" strokeWidth="1" strokeDasharray="3,3" />
          {/* River block */}
          <path d="M 25,125 Q 90,140 145,170 T 365,190" fill="none" stroke="#082F49" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
          {/* Sport block */}
          <rect x="250" y="135" width="100" height="55" rx="14" fill="#2E1065" fillOpacity="0.3" stroke="#4C1D95" strokeWidth="1" strokeDasharray="3,3" />
        </g>

        {/* Quiet connecting road lines */}
        <g stroke="#1E293B" strokeWidth="1" opacity="0.5" strokeDasharray="2,2">
          <line x1="195" y1="45" x2="195" y2="110" />
          <line x1="195" y1="110" x2="305" y2="80" />
          <line x1="195" y1="110" x2="85" y2="155" />
          <line x1="195" y1="110" x2="300" y2="165" />
        </g>

        {/* Primary Visual Element: Glowing Non-overlapping Flames */}
        {markerPositions.map(({ meetup: m, x, y, isSelected }) => {
          const colors = ACTIVITY_PALETTE[m.activityTypeId] || {
            fill: '#F59E0B',
            border: '#FCD34D',
            glow: 'rgba(245, 158, 11, 0.6)',
            text: '#FFFFFF',
          };

          return (
            <g
              key={m.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectMeetup(m.id);
              }}
            >
              {/* Outer pulsing ring for selected or active */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 22 : 14}
                fill={colors.fill}
                opacity={isSelected ? 0.4 : 0.2}
                className="animate-ping"
                style={{ transformOrigin: `${x}px ${y}px`, animationDuration: isSelected ? '1.8s' : '2.5s' }}
              />

              {/* Main Glowing Circle */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 16 : 12}
                fill={colors.fill}
                stroke={isSelected ? '#FFFFFF' : colors.border}
                strokeWidth={isSelected ? 2.5 : 1.2}
                style={{
                  filter: isSelected
                    ? `drop-shadow(0 0 10px ${colors.glow}) drop-shadow(0 0 4px #FFFFFF)`
                    : `drop-shadow(0 0 6px ${colors.glow})`,
                }}
              />

              {/* Flame Emoji / Activity Icon */}
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize={isSelected ? '12' : '9.5'}
                fill={colors.text}
              >
                {m.activityIcon}
              </text>

              {/* Compact Slot Pill Tag */}
              <g transform={`translate(${x + 8}, ${y - 10})`}>
                <rect
                  width="18"
                  height="10"
                  rx="3"
                  fill="#0B0F19"
                  stroke={isSelected ? '#FFFFFF' : colors.border}
                  strokeWidth="0.8"
                />
                <text
                  x="9"
                  y="7.5"
                  textAnchor="middle"
                  fontSize="6.5"
                  fontWeight="bold"
                  fill={isSelected ? '#FFFFFF' : '#CBD5E1'}
                >
                  {m.occupiedSlots}/{m.capacity}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Subdued Bottom Caption */}
      <div className="bg-[#070A12] px-3 py-1 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-500">
        <span>📍 Демонстрационная схема</span>
        <span className="italic">Demo map. Real map data will be connected later.</span>
      </div>
    </div>
  );
};
