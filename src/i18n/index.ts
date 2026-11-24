import en from './en.json';
import vi from './vi.json';

export type Lang = 'en' | 'vi';
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Lang, Record<string, string>> = {
  en,
  vi,
};

export function t(
  lang: Lang,
  key: TranslationKey | (string & {}),
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[lang] ?? dictionaries.en;
  const template = dict[key] ?? dictionaries.en[key] ?? key;

  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return String(params[token]);
    }
    return match;
  });
}
