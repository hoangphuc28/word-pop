import React from 'react';

export interface PlumpStarProps {
  className?: string;
  /** Fill color of the plump star (defaults to warm sunny gold, no orange border) */
  fill?: string;
}

/**
 * Cute, chubby, rounded 5-point star SVG with no orange outline/border.
 */
export function PlumpStar({
  className = 'w-4 h-4',
  fill = '#FACC15',
}: PlumpStarProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 2.8C17.45 2.8 18.7 3.7 19.35 5.05L21.35 9.2C21.65 9.85 22.25 10.3 22.95 10.4L27.45 11.05C28.95 11.27 29.95 12.65 29.7 14.12C29.58 14.82 29.22 15.45 28.7 15.92L25.4 18.95C24.88 19.43 24.64 20.14 24.77 20.84L25.58 25.28C25.85 26.76 24.86 28.18 23.38 28.45C22.68 28.58 21.95 28.45 21.34 28.1L17.32 25.85C16.5 25.39 15.5 25.39 14.68 25.85L10.66 28.1C9.35 28.83 7.7 28.36 6.97 27.05C6.62 26.44 6.5 25.72 6.62 25.02L7.43 20.84C7.56 20.14 7.32 19.43 6.8 18.95L3.5 15.92C2.4 14.9 2.33 13.18 3.35 12.08C3.82 11.56 4.45 11.2 5.15 11.05L9.65 10.4C10.35 10.3 10.95 9.85 11.25 9.2L13.25 5.05C13.9 3.7 15.15 2.8 16 2.8Z"
        fill={fill}
      />
      <ellipse
        cx="13.2"
        cy="11.2"
        rx="2.3"
        ry="1.35"
        transform="rotate(-28 13.2 11.2)"
        fill="#FEF9C3"
        fillOpacity="0.85"
      />
    </svg>
  );
}
