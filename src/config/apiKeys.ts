/**
 * Build-time API keys.
 *
 * Values are injected from a gitignored `.env` at bundle time by
 * `react-native-dotenv` (template: `.env.example`). No key is ever committed.
 * A blank key disables its provider — the app falls back to keyless national
 * services and Open-Meteo rather than failing.
 *
 * After editing `.env`, rebuild and restart Metro with `--reset-cache`.
 */
import {
  KNMI_API_KEY,
  METEOFRANCE_API_KEY,
  AEMET_API_KEY,
  KMA_API_KEY,
  CWA_API_KEY,
  METEOALARM_API_KEY,
} from '@env';

import type {ApiKeyId} from './apiKeyId';

export const apiKeys = {
  knmi: (KNMI_API_KEY ?? '').trim(),
  meteoFranceApiKey: (METEOFRANCE_API_KEY ?? '').trim(),
  aemet: (AEMET_API_KEY ?? '').trim(),
  kma: (KMA_API_KEY ?? '').trim(),
  cwa: (CWA_API_KEY ?? '').trim(),
  meteoAlarm: (METEOALARM_API_KEY ?? '').trim(),
} as const;

/** True when every credential required by `id` is present. */
export function hasApiKey(id: ApiKeyId): boolean {
  switch (id) {
    case 'knmi':
      return apiKeys.knmi.length > 0;
    case 'meteoFrance':
      return apiKeys.meteoFranceApiKey.length > 0;
    case 'aemet':
      return apiKeys.aemet.length > 0;
    case 'kma':
      return apiKeys.kma.length > 0;
    case 'cwa':
      return apiKeys.cwa.length > 0;
    case 'meteoAlarm':
      return apiKeys.meteoAlarm.length > 0;
  }
}
