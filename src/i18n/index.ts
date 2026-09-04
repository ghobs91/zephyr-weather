/**
 * Minimal i18n scaffold (zero dependencies).
 *
 * - Locale is detected once per launch (fixed for the session — dynamic
 *   in-app language switching is future work; replacing this module's
 *   backend with react-i18next later won't change call sites).
 * - `t()` is fully typed: every key must exist in `en.ts`.
 * - Only `en` ships today. To add a language, add `locales/xx.ts`
 *   with the same keys and register it in `dictionaries` below.
 */
import {NativeModules, Platform} from 'react-native';
import {en} from './locales/en';

export type StringKey = keyof typeof en;

const dictionaries: Record<string, Record<StringKey, string>> = {en};

function detectLocale(): string {
  try {
    const tag = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (tag) return tag;
  } catch {
    // Hermes without full ICU — fall through to native modules.
  }
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      return settings?.AppleLocale ?? settings?.AppleLanguages?.[0] ?? 'en';
    }
    return NativeModules.I18nManager?.localeIdentifier ?? 'en';
  } catch {
    return 'en';
  }
}

let cachedLocale: string | null = null;

/** BCP-47 locale tag, e.g. "en-US". Cached per launch. */
export function getLocale(): string {
  if (!cachedLocale) cachedLocale = detectLocale();
  return cachedLocale;
}

/** ISO-639 language code, e.g. "en". Falls back to "en". */
export function getLanguage(): string {
  const code = getLocale().split(/[-_]/)[0]?.toLowerCase() ?? 'en';
  return dictionaries[code] ? code : 'en';
}

/**
 * Translate a key, with optional `{placeholder}` interpolation.
 * Falls back to English, then to the key itself — never blank.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const dict = dictionaries[getLanguage()] ?? en;
  let s: string = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}
