/**
 * Weather source registry.
 *
 * Policy: the authoritative national meteorological service for a location is
 * the PRIMARY source; aggregators (and other national services' global models)
 * only augment it for confidence or act as fallback when it is unavailable.
 *
 * Selection is driven by the location's ISO 3166-1 alpha-2 country code. A
 * national service whose `requiresApiKey` is not configured is treated as
 * unavailable, so the dispatcher falls through to the next usable source and
 * ultimately to Open-Meteo.
 */
import {SourceFeature} from '../types/weather';
import {hasApiKey} from '../config/apiKeys';
import type {ApiKeyId} from '../config/apiKeyId';

export type SourceTier = 'national' | 'aggregator';

export interface WeatherSourceDef {
  id: string;
  name: string;
  tier: SourceTier;
  /** ISO 3166-1 alpha-2 codes this service is authoritative for. */
  countries?: string[];
  /** Fallback geographic guard when the country code is unavailable. */
  covers?: (lat: number, lon: number) => boolean;
  /** Credential required for this source to be usable. */
  requiresApiKey?: ApiKeyId;
  features: SourceFeature[];
  color: string;
  attribution: string;
  homepage?: string;
}

const FORECAST = [SourceFeature.FORECAST, SourceFeature.CURRENT];

/**
 * National services, in priority order. The first entry matching the
 * location's country that is usable wins.
 */
export const NATIONAL_SOURCES: WeatherSourceDef[] = [
  {
    id: 'nws',
    name: 'NOAA National Weather Service',
    tier: 'national',
    countries: ['US'],
    features: [...FORECAST, SourceFeature.ALERT, SourceFeature.NORMALS],
    color: '#1E40AF',
    attribution: 'NOAA / National Weather Service',
    homepage: 'https://www.weather.gov',
  },
  {
    id: 'eccc',
    name: 'Environment and Climate Change Canada',
    tier: 'national',
    countries: ['CA'],
    features: [...FORECAST, SourceFeature.ALERT, SourceFeature.AIR_QUALITY],
    color: '#B91C1C',
    attribution: 'Environment and Climate Change Canada',
    homepage: 'https://weather.gc.ca',
  },
  {
    id: 'meteoFrance',
    name: 'Météo-France',
    tier: 'national',
    countries: ['FR', 'MC'],
    requiresApiKey: 'meteoFrance',
    features: FORECAST,
    color: '#0055A4',
    attribution: 'Météo-France',
    homepage: 'https://meteofrance.com',
  },
  {
    id: 'knmi',
    name: 'KNMI',
    tier: 'national',
    countries: ['NL'],
    requiresApiKey: 'knmi',
    features: [...FORECAST, SourceFeature.ALERT],
    color: '#0B7285',
    attribution: 'Koninklijk Nederlands Meteorologisch Instituut',
    homepage: 'https://www.knmi.nl',
  },
  {
    id: 'aemet',
    name: 'AEMET',
    tier: 'national',
    countries: ['ES'],
    requiresApiKey: 'aemet',
    features: [...FORECAST, SourceFeature.ALERT],
    color: '#C60B1E',
    attribution: 'Agencia Estatal de Meteorología',
    homepage: 'https://www.aemet.es',
  },
  {
    id: 'fmi',
    name: 'Finnish Meteorological Institute',
    tier: 'national',
    countries: ['FI', 'AX'],
    features: FORECAST,
    color: '#003580',
    attribution: 'Finnish Meteorological Institute (FMI)',
    homepage: 'https://en.ilmatieteenlaitos.fi/open-data',
  },
  {
    id: 'metno',
    name: 'MET Norway',
    tier: 'national',
    countries: ['NO', 'SJ', 'BV'],
    features: FORECAST,
    color: '#0F766E',
    attribution: 'Norwegian Meteorological Institute (MET Norway)',
    homepage: 'https://api.met.no',
  },
  {
    id: 'brightsky',
    name: 'Deutscher Wetterdienst (Bright Sky)',
    tier: 'national',
    countries: ['DE'],
    features: FORECAST,
    color: '#111827',
    attribution: 'Bright Sky · Deutscher Wetterdienst (DWD)',
    homepage: 'https://brightsky.dev',
  },
  {
    id: 'jma',
    name: 'Japan Meteorological Agency',
    tier: 'national',
    countries: ['JP'],
    features: FORECAST,
    color: '#BC002D',
    attribution: 'Japan Meteorological Agency (気象庁)',
    homepage: 'https://www.jma.go.jp',
  },
  {
    id: 'kma',
    name: 'Korea Meteorological Administration',
    tier: 'national',
    countries: ['KR'],
    requiresApiKey: 'kma',
    features: FORECAST,
    color: '#003478',
    attribution: 'Korea Meteorological Administration (기상청)',
    homepage: 'https://www.kma.go.kr',
  },
  {
    id: 'cwa',
    name: 'Central Weather Administration',
    tier: 'national',
    countries: ['TW'],
    requiresApiKey: 'cwa',
    features: [...FORECAST, SourceFeature.ALERT],
    color: '#00529B',
    attribution: 'Central Weather Administration (中央氣象署)',
    homepage: 'https://www.cwa.gov.tw',
  },
  {
    id: 'sg',
    name: 'Meteorological Service Singapore',
    tier: 'national',
    countries: ['SG'],
    features: FORECAST,
    color: '#EF3340',
    attribution: 'Meteorological Service Singapore (NEA)',
    homepage: 'https://www.weather.gov.sg',
  },
  {
    id: 'hko',
    name: 'Hong Kong Observatory',
    tier: 'national',
    countries: ['HK'],
    features: [...FORECAST, SourceFeature.ALERT],
    color: '#005BAC',
    attribution: 'Hong Kong Observatory',
    homepage: 'https://www.hko.gov.hk',
  },
  {
    id: 'my',
    name: 'Malaysian Meteorological Department',
    tier: 'national',
    countries: ['MY'],
    features: FORECAST,
    color: '#010066',
    attribution: 'Malaysian Meteorological Department (MetMalaysia)',
    homepage: 'https://www.met.gov.my',
  },
];

/**
 * Sources that never act as a "national primary" but may augment any location's
 * forecast. Their global models are uncorrelated with the primary's, which is
 * what makes the ensemble mean worthwhile.
 */
export const AUGMENTING_SOURCES: WeatherSourceDef[] = [
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    tier: 'aggregator',
    features: [
      ...FORECAST,
      SourceFeature.MINUTELY,
      SourceFeature.AIR_QUALITY,
      SourceFeature.POLLEN,
      SourceFeature.LOCATION_SEARCH,
    ],
    color: '#FF6B35',
    attribution: 'Open-Meteo.com (CC-BY 4.0)',
    homepage: 'https://open-meteo.com',
  },
  {
    id: 'metno-global',
    name: 'MET Norway',
    tier: 'aggregator',
    features: FORECAST,
    color: '#0F766E',
    attribution: 'Norwegian Meteorological Institute (MET Norway)',
    homepage: 'https://api.met.no',
  },
  {
    id: 'brightsky-global',
    name: 'Bright Sky (DWD ICON)',
    tier: 'aggregator',
    features: FORECAST,
    color: '#111827',
    attribution: 'Bright Sky · Deutscher Wetterdienst (DWD)',
    homepage: 'https://brightsky.dev',
  },
];

export const ALL_SOURCES: WeatherSourceDef[] = [
  ...NATIONAL_SOURCES,
  ...AUGMENTING_SOURCES,
];

/**
 * The authoritative national source for a location, or undefined when no
 * integrated national service covers it (or its key is missing). Callers then
 * fall back to the augmenting aggregators.
 */
export function selectNationalSource(
  countryCode: string | undefined,
  lat: number,
  lon: number,
): WeatherSourceDef | undefined {
  const cc = countryCode?.toUpperCase();
  return NATIONAL_SOURCES.find((source) => {
    if (source.requiresApiKey && !hasApiKey(source.requiresApiKey)) {
      return false;
    }
    if (cc && source.countries) return source.countries.includes(cc);
    return source.covers ? source.covers(lat, lon) : false;
  });
}
