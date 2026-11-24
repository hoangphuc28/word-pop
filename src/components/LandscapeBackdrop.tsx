import React from 'react';
import { motion } from 'framer-motion';
import { PlumpStar } from './PlumpStar';

const FLOATING_TILES = [
  { symbol: 'W', bg: 'bg-[#FF7A59] border-[#D95334] text-white', x: '6%', y: '14%', delay: 0 },
  { symbol: 'A', bg: 'bg-[#38BDF8] border-[#0284C7] text-white', x: '86%', y: '12%', delay: 0.3 },
  { symbol: 'B', bg: 'bg-[#8B5CF6] border-[#6D28D9] text-white', x: '8%', y: '72%', delay: 0.6 },
  { symbol: 'C', bg: 'bg-[#10B981] border-[#059669] text-white', x: '88%', y: '68%', delay: 0.9 },
  { symbol: '★', bg: 'bg-[#FBBF24] border-[#D97706] text-amber-950', x: '48%', y: '7%', delay: 0.45 },
];

export interface LandscapeBackdropProps {
  /** Use fixed positioning for full-viewport outer page backdrop, or absolute for contained screens */
  fixed?: boolean;
}

/**
 * Playful sky, sun, fluffy clouds, rolling green hills, and floating 2.5D letter tiles backdrop
 * shared between the Splash screen and the outer frame behind the Game Stage.
 */
export function LandscapeBackdrop({
  fixed = false,
}: LandscapeBackdropProps): React.JSX.Element {
  const posClass = fixed ? 'fixed inset-0' : 'absolute inset-0';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${posClass} z-0 overflow-hidden select-none bg-gradient-to-b from-[#8DD6FF] via-[#D4EEFF] to-[#FFF4D6]`}
    >
      {/* Playful illustrated hills & clouds background */}
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Soft sun glow */}
        <circle cx="1220" cy="140" r="115" fill="#FDE047" opacity="0.72" />
        <circle cx="1220" cy="140" r="74" fill="#F59E0B" opacity="0.88" />

        {/* Fluffy clouds */}
        <g fill="#FFFFFF" opacity="0.92">
          <ellipse cx="220" cy="170" rx="85" ry="34" />
          <ellipse cx="265" cy="150" rx="60" ry="32" />
          <ellipse cx="185" cy="158" rx="45" ry="26" />

          <ellipse cx="1020" cy="240" rx="75" ry="28" />
          <ellipse cx="1060" cy="222" rx="50" ry="26" />
        </g>

        {/* Rolling pastel hills */}
        <path
          d="M0 720 Q 360 610 720 710 T 1440 690 L 1440 900 L 0 900 Z"
          fill="#6EE7B7"
          opacity="0.82"
        />
        <path
          d="M0 780 Q 420 680 860 770 T 1440 750 L 1440 900 L 0 900 Z"
          fill="#34D399"
          opacity="0.9"
        />
      </svg>

      {/* Floating 2.5D Letter Tiles */}
      {FLOATING_TILES.map((tile) => (
        <motion.div
          key={tile.symbol}
          className={`absolute flex h-12 w-12 sm:h-15 sm:w-15 items-center justify-center rounded-2xl border-b-[5px] font-display text-2xl sm:text-3xl font-black shadow-lg bevel-25d ${tile.bg}`}
          style={{ left: tile.x, top: tile.y }}
          animate={{ y: [0, -14, 0], rotate: [-4, 4, -4] }}
          transition={{
            duration: 3.4,
            delay: tile.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {tile.symbol === '★' ? (
            <PlumpStar className="h-7 w-7" fill="#FFFFFF" />
          ) : (
            tile.symbol
          )}
        </motion.div>
      ))}
    </div>
  );
}
