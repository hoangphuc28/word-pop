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
    'bg-[#FEF3C7] text-amber-950 border-amber-300 border-b-amber-400 cursor-default',
  blank:
    'bg-rose-50/95 hover:bg-rose-100/90 text-rose-500 border-dashed border-rose-300 border-b-rose-400',
  tray:
    'bg-[#FFFDF9] hover:bg-amber-50 text-slate-900 border-amber-200 border-b-amber-300',
  placed:
    'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border-[#7C3AED] border-b-[#5B21B6]',
  valid:
    'bg-[#10B981] text-white border-[#059669] border-b-[#047857]',
  invalid:
    'bg-[#F43F5E] text-white border-[#E11D48] border-b-[#BE123C]',
  hint:
    'bg-[#FFEDD5] text-orange-950 border-[#FB923C] border-b-[#EA580C]',
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
      ? 'bg-[#FF7A59] hover:bg-[#FF6842] text-white border-[#EA580C] border-b-[#C2410C]'
      : selected && variant === 'blank'
        ? 'bg-violet-100 text-violet-700 border-solid border-violet-500 border-b-violet-600'
        : VARIANT_STYLES[variant];

  const interactiveClasses =
    variant === 'fixed'
      ? ''
      : 'cursor-pointer active:translate-y-[3px] active:border-b-2';

  const selectedClasses = selected
    ? variant === 'blank'
      ? 'ring-4 ring-violet-300 scale-105 shadow-lg z-10'
      : 'ring-4 ring-orange-300 -translate-y-1.5 scale-110 shadow-xl z-10'
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
