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
      className={`pointer-events-none ${posClass} z-0 overflow-hidden select-none bg-gradient-to-b from-[#C4B5FD] via-[#FBCFE8] to-[#FEF3C7]`}
    >
      {/* Playful illustrated warm sunset hills & clouds background */}
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Warm coral-apricot sunset glow */}
        <circle cx="1180" cy="165" r="135" fill="#FDE68A" opacity="0.68" />
        <circle cx="1180" cy="165" r="82" fill="#FB7185" opacity="0.72" />
        <circle cx="1180" cy="165" r="56" fill="#FF7A59" opacity="0.92" />

        {/* Soft cream sunset clouds */}
        <g fill="#FFFDF9" opacity="0.88">
          <ellipse cx="240" cy="175" rx="92" ry="34" />
          <ellipse cx="290" cy="154" rx="64" ry="32" />
          <ellipse cx="195" cy="164" rx="48" ry="26" />

          <ellipse cx="960" cy="245" rx="80" ry="28" />
          <ellipse cx="1005" cy="226" rx="54" ry="26" />
        </g>

        {/* Distant lavender-indigo ridge */}
        <path
          d="M0 685 Q 340 580 740 675 T 1440 655 L 1440 900 L 0 900 Z"
          fill="#A78BFA"
          opacity="0.45"
        />

        {/* Rolling warm sage-teal hills */}
        <path
          d="M0 735 Q 380 630 760 725 T 1440 705 L 1440 900 L 0 900 Z"
          fill="#5EEAD4"
          opacity="0.78"
        />
        <path
          d="M0 790 Q 440 695 890 780 T 1440 760 L 1440 900 L 0 900 Z"
          fill="#2DD4BF"
          opacity="0.88"
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
