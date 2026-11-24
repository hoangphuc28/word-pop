import React from 'react';
import { Check, Delete } from 'lucide-react';

export interface QwertyBar25DProps {
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
}

const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'] as const;
const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'] as const;
const ROW_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'] as const;

const KEY_BASE_CLASS =
  'inline-flex items-center justify-center min-h-[42px] sm:min-h-[46px] rounded-xl font-display font-extrabold text-sm sm:text-base border-2 border-b-[4px] bevel-25d select-none touch-manipulation cursor-pointer transition-all duration-100 ease-out active:translate-y-[2px] active:border-b-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/75 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-[4px]';

export function QwertyBar25D({
  onKey,
  onBackspace,
  onSubmit,
  disabled = false,
}: QwertyBar25DProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Letter keyboard"
      className="w-full max-w-md mx-auto flex flex-col gap-1.5 select-none touch-manipulation"
    >
      {/* Row 1 */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
        {ROW_1.map((letter) => (
          <button
            key={letter}
            type="button"
            disabled={disabled}
            onClick={() => onKey(letter)}
            className={`${KEY_BASE_CLASS} flex-1 min-w-0 bg-white hover:bg-amber-50 text-slate-800 border-slate-300 border-b-slate-400`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4">
        {ROW_2.map((letter) => (
          <button
            key={letter}
            type="button"
            disabled={disabled}
            onClick={() => onKey(letter)}
            className={`${KEY_BASE_CLASS} flex-1 min-w-0 bg-white hover:bg-amber-50 text-slate-800 border-slate-300 border-b-slate-400`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Row 3 */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
        {ROW_3.map((letter) => (
          <button
            key={letter}
            type="button"
            disabled={disabled}
            onClick={() => onKey(letter)}
            className={`${KEY_BASE_CLASS} flex-1 min-w-0 bg-white hover:bg-amber-50 text-slate-800 border-slate-300 border-b-slate-400`}
          >
            {letter}
          </button>
        ))}

        <button
          type="button"
          aria-label="Backspace"
          disabled={disabled}
          onClick={onBackspace}
          className={`${KEY_BASE_CLASS} flex-[1.4] min-w-[44px] px-2 bg-[#FF7A59] hover:bg-[#FF6842] text-white border-[#EA580C] border-b-[#C2410C]`}
        >
          <Delete className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
        </button>

        {onSubmit && (
          <button
            type="button"
            aria-label="Submit"
            disabled={disabled}
            onClick={onSubmit}
            className={`${KEY_BASE_CLASS} flex-[1.4] min-w-[44px] px-2 bg-[#10B981] hover:bg-[#059669] text-white border-[#059669] border-b-[#047857]`}
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
