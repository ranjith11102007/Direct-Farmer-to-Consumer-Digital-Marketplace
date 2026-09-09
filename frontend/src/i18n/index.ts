import { en } from './en';
import { ta } from './ta';

type Language = 'en' | 'ta';

const translations: Record<Language, Record<string, unknown>> = {
  en: en as unknown as Record<string, unknown>,
  ta,
};

function getValue(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  if (typeof current === 'string') {
    return current;
  }
  return undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce((acc, [key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return acc.replace(regex, String(value));
  }, template);
}

export function t(key: string, lang: Language = 'en', params?: Record<string, string | number>): string {
  const langValue = getValue(translations[lang], key);
  if (langValue !== undefined) {
    return interpolate(langValue, params);
  }
  const enValue = getValue(translations.en, key);
  if (enValue !== undefined) {
    return interpolate(enValue, params);
  }
  return key;
}

export function getNestedTranslations(prefix: string, lang: Language): Record<string, string> {
  const source = translations[lang] as Record<string, unknown>;
  const value = getValue(source, prefix);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, val]) => ({ ...acc, [key]: typeof val === 'string' ? val : JSON.stringify(val) }),
      {}
    );
  }
  return {};
}

export type { Language };

export default t;