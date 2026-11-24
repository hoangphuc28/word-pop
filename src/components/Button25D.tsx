import React from 'react';

export type Button25DColor =
  | 'sky'
  | 'coral'
  | 'lavender'
  | 'mint'
  | 'sunny'
  | 'slate'
  | 'white';

export interface Button25DProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: Button25DColor;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const COLOR_STYLES: Record<Button25DColor, string> = {
  sky: 'bg-[#38BDF8] hover:bg-[#22B3F4] text-white border-[#0284C7] border-b-[#0369A1]',
  coral: 'bg-[#FF7A59] hover:bg-[#FF6842] text-white border-[#EA580C] border-b-[#C2410C]',
  lavender: 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border-[#7C3AED] border-b-[#5B21B6]',
  mint: 'bg-[#10B981] hover:bg-[#059669] text-white border-[#059669] border-b-[#047857]',
  sunny: 'bg-[#FBBF24] hover:bg-[#F59E0B] text-amber-950 border-[#D97706] border-b-[#B45309]',
  slate: 'bg-slate-600 hover:bg-slate-500 text-white border-slate-700 border-b-slate-800',
  white: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 border-b-slate-300',
};

const SIZE_STYLES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-3.5 py-2 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-base gap-2',
  lg: 'px-7 py-3.5 text-lg gap-2.5',
};

export function Button25D({
  color = 'sky',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: Button25DProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-2xl font-display font-bold tracking-wide',
        'border-2 border-b-[5px] bevel-25d select-none touch-manipulation cursor-pointer',
        'transition-all duration-100 ease-out',
        'active:translate-y-[3px] active:border-b-2',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/75',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-[5px]',
        COLOR_STYLES[color],
        SIZE_STYLES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
