import { translations, type Lang } from './translations';

const SUPPORTED_LANGS: Lang[] = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];

export function getDefaultLang(): Lang {
  return 'en';
}

export function getSupportedLangs(): Lang[] {
  return SUPPORTED_LANGS;
}

export function isSupportedLang(lang: string): lang is Lang {
  return SUPPORTED_LANGS.includes(lang as Lang);
}

export function getLangFromUrl(url: URL | string): Lang {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isSupportedLang(first) && first !== 'en') {
    return first;
  }
  return 'en';
}

export function getTranslations(lang: Lang) {
  return translations[lang] ?? translations.en;
}

export function formatLangPath(lang: Lang, path: string): string {
  if (lang === 'en') {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${lang}${cleanPath}`;
}

export const langLabels: Record<Lang, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
};
