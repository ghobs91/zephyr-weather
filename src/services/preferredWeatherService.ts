import {
  fetchWeather,
  fetchAirQuality,
  fetchMinutelyPrecipitation,
} from './openMeteoService';
import {fetchNWSWeather, isUSLocation} from './nwsService';
import {fetchMetNoWeather} from './metnoService';
import {fetchBrightSkyWeather} from './brightSkyService';
import {fetchEcccWeather} from './ecccService';
import {fetchFmiWeather} from './fmiService';
import {fetchJmaWeather} from './jmaService';
import {fetchMeteoFranceWeather} from './meteoFranceService';
import {fetchKnmiWeather} from './knmiService';
import {fetchAemetWeather} from './aemetService';
import {fetchKmaWeather} from './kmaService';
import {fetchCwaWeather} from './cwaService';
import {fetchSgWeather} from './sgService';
import {fetchHkoWeather} from './hkoService';
import {fetchMyWeather} from './myService';
import {fetchMeteoAlarmAlerts} from './meteoAlarmService';
import {fetchSpaceWeather} from './swpcService';
import {fetchTides} from './noaaCoopsService';
import {combineEnsemble, EnsembleSource} from './ensembleService';
import {
  AUGMENTING_SOURCES,
  NATIONAL_SOURCES,
  selectNationalSource,
  WeatherSourceDef,
} from './weatherSources';
import {Weather} from '../types/weather';

type Fetcher = (
  lat: number,
  lon: number,
  tz: string,
  locationName?: string,
) => Promise<Weather | null>;

/**
 * National primary fetchers. Keyed providers are registered here as their
 * services are wired — an absent entry means the source is skipped and the
 * next usable source (ultimately Open-Meteo) takes over.
 */
const NATIONAL_FETCHERS: Partial<Record<string, Fetcher>> = {
  nws: async (lat, lon, tz) => {
    // NWS doesn't provide air quality; enrich the authoritative current
    // conditions with Open-Meteo's AQI so the heaviest source still has it.
    const weather = await fetchNWSWeather(lat, lon);
    const airQuality = await fetchAirQuality(lat, lon, tz).catch(() => null);
    if (weather.current && airQuality) {
      weather.current.airQuality = airQuality;
    }
    return weather;
  },
  eccc: fetchEcccWeather,
  fmi: fetchFmiWeather,
  jma: fetchJmaWeather,
  metno: fetchMetNoWeather,
  brightsky: fetchBrightSkyWeather,
  meteoFrance: fetchMeteoFranceWeather,
  knmi: fetchKnmiWeather,
  aemet: fetchAemetWeather,
  kma: fetchKmaWeather,
  cwa: fetchCwaWeather,
  sg: fetchSgWeather,
  hko: fetchHkoWeather,
  my: fetchMyWeather,
};

/** Global models used only to augment the primary (or replace it on failure). */
const AUGMENT_FETCHERS: Record<string, Fetcher> = {
  'open-meteo': fetchWeather,
  'metno-global': fetchMetNoWeather,
  'brightsky-global': fetchBrightSkyWeather,
};

/** Maps an augmenting registry id to the underlying service id, so the
 *  primary's own model is not fetched twice (e.g. Norway: met.no). */
const AUGMENT_SERVICE_ID: Record<string, string> = {
  'open-meteo': 'open-meteo',
  'metno-global': 'metno',
  'brightsky-global': 'brightsky',
};

const PRIMARY_WEIGHT = 3;
const AUGMENT_WEIGHT = 1;

const OPEN_METEO_ATTRIBUTION =
  AUGMENTING_SOURCES.find((source) => source.id === 'open-meteo')
    ?.attribution ?? 'Open-Meteo.com (CC-BY 4.0)';

/** A fetched source plus the attribution string to credit if it is used. */
interface SourcedWeather {
  source: EnsembleSource;
  attribution: string;
}

/** EUMETNET members covered by the MeteoAlarm warnings feed. */
const EUMETNET_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IS',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'CH',
  'GB',
  'RS',
  'BA',
  'MK',
  'AL',
  'ME',
  'MD',
  'UA',
  'TR',
]);

async function runFetcher(
  def: WeatherSourceDef,
  fetcher: Fetcher,
  lat: number,
  lon: number,
  tz: string,
  weight: number,
  locationName?: string,
): Promise<SourcedWeather | null> {
  try {
    const weather = await fetcher(lat, lon, tz, locationName);
    if (!weather) return null;
    return {
      source: {name: def.name, weather, weight},
      attribution: def.attribution,
    };
  } catch (err) {
    console.warn(`${def.name} fetch failed:`, err);
    return null;
  }
}

/**
 * Fetches weather with national-official-first priority.
 *
 * The authoritative national service for `countryCode` (if integrated and
 * usable) is the primary source and carries dominant ensemble weight; global
 * models augment it for confidence and serve as fallback when it is
 * unavailable. Open-Meteo remains the global last resort.
 */
export async function fetchPreferredWeather(
  latitude: number,
  longitude: number,
  timezone: string,
  countryCode?: string,
  locationName?: string,
): Promise<Weather> {
  let primary: WeatherSourceDef | undefined = selectNationalSource(
    countryCode,
    latitude,
    longitude,
  );

  // US coverage is authoritative via api.weather.gov's own check when the
  // caller has no country code (e.g. a raw GPS fix before reverse geocoding).
  if (!primary && !countryCode) {
    const isUS = await isUSLocation(latitude, longitude).catch(() => false);
    if (isUS) primary = NATIONAL_SOURCES.find((s) => s.id === 'nws');
  }

  const jobs: Array<Promise<SourcedWeather | null>> = [];

  if (primary) {
    const fetcher = NATIONAL_FETCHERS[primary.id];
    if (fetcher) {
      jobs.push(
        runFetcher(
          primary,
          fetcher,
          latitude,
          longitude,
          timezone,
          PRIMARY_WEIGHT,
          locationName,
        ),
      );
    }
  }

  for (const source of AUGMENTING_SOURCES) {
    if (primary && AUGMENT_SERVICE_ID[source.id] === primary.id) continue;
    const fetcher = AUGMENT_FETCHERS[source.id];
    if (!fetcher) continue;
    jobs.push(
      runFetcher(
        source,
        fetcher,
        latitude,
        longitude,
        timezone,
        AUGMENT_WEIGHT,
        locationName,
      ),
    );
  }

  // Minutely precipitation is a pseudo-source contributing only minutely data.
  jobs.push(
    fetchMinutelyPrecipitation(latitude, longitude)
      .then((minutely): SourcedWeather | null =>
        minutely.length
          ? {
              source: {
                name: 'Open-Meteo-Minutely',
                weather: {
                  dailyForecast: [],
                  hourlyForecast: [],
                  minutelyForecast: minutely,
                },
                weight: AUGMENT_WEIGHT,
              },
              attribution: OPEN_METEO_ATTRIBUTION,
            }
          : null,
      )
      .catch((err) => {
        console.warn('Minutely precipitation fetch failed:', err);
        return null;
      }),
  );

  const results = (await Promise.all(jobs)).filter(
    (result): result is SourcedWeather => result !== null,
  );

  let combined: Weather;
  const usedAttributions: string[] = [];
  if (!results.length) {
    console.warn('All weather sources failed, attempting final fallback');
    combined = await fetchWeather(latitude, longitude, timezone);
    usedAttributions.push(OPEN_METEO_ATTRIBUTION);
  } else {
    combined = combineEnsemble(results.map((result) => result.source));
    for (const result of results) {
      if (!usedAttributions.includes(result.attribution)) {
        usedAttributions.push(result.attribution);
      }
    }
  }
  combined.base = {
    ...(combined.base ?? {refreshTime: new Date()}),
    attribution: usedAttributions.join(' · '),
  };

  // Feature data — not ensemble inputs.
  const [spaceWeather, tides, meteoAlarmAlerts] = await Promise.all([
    fetchSpaceWeather().catch(() => null),
    countryCode === 'US'
      ? fetchTides(latitude, longitude).catch(() => null)
      : Promise.resolve(null),
    countryCode && EUMETNET_COUNTRIES.has(countryCode.toUpperCase())
      ? fetchMeteoAlarmAlerts(latitude, longitude).catch(() => [])
      : Promise.resolve([]),
  ]);
  if (spaceWeather) combined.spaceWeather = spaceWeather;
  if (tides) combined.tides = tides;
  if (meteoAlarmAlerts.length) {
    const existing = combined.alerts ?? [];
    const seen = new Set(existing.map((alert) => alert.headline));
    combined.alerts = [
      ...existing,
      ...meteoAlarmAlerts.filter((alert) => !seen.has(alert.headline)),
    ];
  }

  return combined;
}
