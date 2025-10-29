// useTranslation.ts
import { translations as englishBaseTranslations, LanguageCode, TranslationKey } from './translations';

const interpolate = (str: string, replacements: Record<string, string | number> = {}): string => {
  return str.replace(/\{(\w+)\}/g, (placeholder, key) => {
    return replacements[key] !== undefined ? String(replacements[key]) : placeholder;
  });
};

type AllTranslations = Record<LanguageCode, Record<TranslationKey, string>>;

export const useTranslation = (language: LanguageCode, allTranslations: AllTranslations) => {
  const t = (key: TranslationKey, replacements?: Record<string, string | number>): string => {
    const langTranslations = allTranslations[language] || englishBaseTranslations.en;
    const translation = langTranslations[key] || englishBaseTranslations.en[key];

    if (!translation) {
      console.warn(`Translation key "${key}" not found.`);
      return key;
    }

    return interpolate(translation, replacements);
  };

  return { t };
};