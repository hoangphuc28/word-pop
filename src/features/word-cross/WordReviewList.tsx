import React from 'react';
import { BookOpen, Volume2 } from 'lucide-react';
import { speechEngine } from '../../audio/speechEngine';
import { Card25D } from '../../components/Card25D';
import type { VocabEntry } from '../../engine/types';
import { t, type Lang } from '../../i18n';

export interface WordReviewListProps {
  entries: VocabEntry[];
  lang: Lang;
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function WordReviewList({
  entries,
  lang,
}: WordReviewListProps): React.JSX.Element {
  return (
    <section
      data-testid="word-review-list"
      aria-label={t(lang, 'game.reviewWords')}
      className="w-full space-y-3"
    >
      <div className="flex items-center gap-2 px-1">
        <BookOpen className="h-4 w-4 text-sky-600" aria-hidden="true" />
        <h3 className="font-display text-base font-extrabold text-slate-800">
          {t(lang, 'game.reviewWords')}
        </h3>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card25D key={entry.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl font-extrabold text-slate-900">
                    {capitalizeWord(entry.word)}
                  </span>
                  <span className="rounded-lg bg-sky-50 px-2 py-0.5 font-mono text-xs font-semibold text-sky-700 border border-sky-200">
                    {entry.ipa}
                  </span>
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-extrabold text-violet-700 border border-violet-200">
                    {entry.pos}
                  </span>
                </div>

                <div className="mt-2 space-y-0.5 text-sm">
                  <p className="font-bold text-slate-800">{entry.vi}</p>
                  <p className="text-slate-600">{entry.en}</p>
                </div>
              </div>

              <button
                type="button"
                aria-label={`${t(lang, 'game.listen')} ${entry.word}`}
                onClick={() =>
                  entry.audioUrl
                    ? speechEngine.speak(entry.word, entry.audioUrl)
                    : speechEngine.speak(entry.word)
                }
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white px-3 py-2 text-xs font-extrabold border-2 border-sky-600 border-b-[4px] border-b-sky-700 bevel-25d cursor-pointer active:translate-y-[2px] active:border-b-2 transition-all"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>{t(lang, 'game.listen')}</span>
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 px-3 py-2.5 flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 italic">
                  &ldquo;{entry.example}&rdquo;
                </p>
                {lang === 'vi' && entry.exampleVi && (
                  <p className="text-xs font-medium text-slate-500">
                    {entry.exampleVi}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={`${t(lang, 'game.listen')} example for ${entry.word}`}
                onClick={() => speechEngine.speak(entry.example)}
                className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 border-b-[3px] border-b-slate-300 cursor-pointer active:translate-y-[1px] transition-all"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </Card25D>
        ))}
      </div>
    </section>
  );
}
