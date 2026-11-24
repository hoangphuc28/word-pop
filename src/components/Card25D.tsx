import React from 'react';

export function Card25D({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={[
        'bg-white/95 rounded-3xl border-2 border-slate-200/80 border-b-[6px] border-b-slate-300/90 card-25d p-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
