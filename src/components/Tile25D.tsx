import React from 'react';

export type Tile25DVariant =
  | 'fixed'
  | 'blank'
  | 'tray'
  | 'placed'
  | 'valid'
  | 'invalid'
  | 'hint';

export interface Tile25DProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: Tile25DVariant;
  selected?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'square' | 'chip';
  clueNumber?: number;
}

const VARIANT_STYLES: Record<Tile25DVariant, string> = {
  fixed:
    'bg-slate-200/90 text-slate-900 border-slate-300 border-b-slate-400 cursor-default',
  blank:
    'bg-sky-100/90 hover:bg-sky-200/80 text-sky-600 border-dashed border-sky-400 border-b-sky-500',
  tray:
    'bg-white hover:bg-amber-50 text-slate-900 border-slate-300 border-b-slate-400',
  placed:
    'bg-[#0EA5E9] hover:bg-[#0284C7] text-white border-[#0284C7] border-b-[#0369A1]',
  valid:
    'bg-[#059669] text-white border-[#047857] border-b-[#065F46]',
  invalid:
    'bg-[#F43F5E] text-white border-[#E11D48] border-b-[#BE123C]',
  hint:
    'bg-[#FEF3C7] text-amber-900 border-[#F59E0B] border-b-[#D97706]',
};

const SQUARE_SIZE_STYLES: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'w-8 h-8 text-sm rounded-lg border-b-[4px]',
  sm: 'w-10 h-10 text-base rounded-xl',
  md: 'w-12 h-12 text-xl rounded-2xl',
  lg: 'w-14 h-14 text-2xl rounded-2xl',
};

const CHIP_SIZE_STYLES: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'min-w-12 h-8 px-3 text-sm rounded-xl border-b-[4px]',
  sm: 'min-w-16 h-10 px-4 text-base rounded-xl',
  md: 'min-w-20 h-12 px-5 text-lg rounded-2xl',
  lg: 'min-w-24 h-14 px-6 text-xl rounded-2xl',
};

export function Tile25D({
  value,
  variant = 'tray',
  selected = false,
  size = 'md',
  shape = 'square',
  clueNumber,
  className = '',
  type = 'button',
  ...rest
}: Tile25DProps): React.JSX.Element {
  const variantClasses =
    selected && variant === 'tray'
      ? 'bg-[#FBBF24] hover:bg-[#F59E0B] text-amber-950 border-[#D97706] border-b-[#B45309]'
      : selected && variant === 'blank'
        ? 'bg-sky-200/90 text-sky-700 border-solid border-sky-500 border-b-sky-600'
        : VARIANT_STYLES[variant];

  const interactiveClasses =
    variant === 'fixed'
      ? ''
      : 'cursor-pointer active:translate-y-[3px] active:border-b-2';

  const selectedClasses = selected
    ? variant === 'blank'
      ? 'ring-4 ring-sky-300 scale-105 shadow-lg z-10'
      : 'ring-4 ring-amber-300 -translate-y-1.5 scale-110 shadow-xl z-10'
    : '';

  const sizeClasses =
    shape === 'chip' ? CHIP_SIZE_STYLES[size] : SQUARE_SIZE_STYLES[size];

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={[
        'relative inline-flex items-center justify-center font-display font-extrabold',
        shape === 'square' ? 'px-1' : '',
        'border-2 border-b-[5px] bevel-25d select-none touch-manipulation',
        'transition-all duration-100 ease-out',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/75',
        'disabled:opacity-55 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-[5px]',
        sizeClasses,
        variantClasses,
        interactiveClasses,
        selectedClasses,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {clueNumber !== undefined && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-bold leading-none opacity-75"
        >
          {clueNumber}
        </span>
      )}
      <span>{value}</span>
    </button>
  );
}
