/**
 * KNMI (Netherlands) — national forecast for the Netherlands.
 *
 * UNVERIFIED: uses the KNMI Data Platform EDR API (CoverageJSON) against the
 * HARMONIE AROME collection. Parameter names vary between collection versions,
 * so each field tries a few candidates and unknown data degrades to null.
 * https://developer.dataplatform.knmi.nl/edr-api
 */
import axios from 'axios';
import {Weather, WeatherCode} from '../types/weather';
import {apiKeys, hasApiKey} from '../config/apiKeys';
import {
  hourlyFromSeries,
  weatherFromHourly,
  HourlySeriesInput,
} from './weatherMapping';

const KNMI_URL =
  'https://api.dataplatform.knmi.nl/edr/v1/collections/harmonie_arome_cy43/position';

const CANDIDATES = {
  temperature: ['air_temperature', 'temperature'],
  dewPoint: ['dew_point_temperature', 'dewpoint'],
  windSpeed: ['wind_speed', 'wind_speed_10m', 'windspeed'],
  windDirection: ['wind_direction', 'wind_direction_10m', 'winddirection'],
  precipitation: ['precipitation_amount', 'precipitation', 'precipitation_1h'],
  cloudCover: ['cloud_cover', 'cloudcover'],
  humidity: ['relative_humidity', 'humidity'],
  uv: ['uv_index', 'uvindex'],
};

interface CoverageJson {
  domain?: {axes?: {t?: {values?: string[]}}};
  ranges?: Record<string, {values?: Array<number | null>}>;
}

function pick(
  ranges: Record<string, {values?: Array<number | null>}>,
  candidates: string[],
  index: number,
): number | undefined {
  for (const name of candidates) {
    const value = ranges[name]?.values?.[index];
    if (typeof value === 'number') return value;
  }
  return undefined;
}

export async function fetchKnmiWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'Europe/Amsterdam',
): Promise<Weather | null> {
  if (!hasApiKey('knmi')) return null;

  const response = await axios.get<CoverageJson>(KNMI_URL, {
    params: {
      coords: `POINT(${longitude} ${latitude})`,
      parameterName: Object.values(CANDIDATES)
        .map((c) => c[0])
        .join(','),
      f: 'CoverageJSON',
    },
    headers: {Authorization: apiKeys.knmi},
  });

  const ranges = response.data?.ranges ?? {};
  const times = response.data?.domain?.axes?.t?.values ?? [];
  if (!times.length || !Object.keys(ranges).length) return null;

  const rows: HourlySeriesInput[] = times.map((time, index) => {
    const windSpeedMs = pick(ranges, CANDIDATES.windSpeed, index);
    const precipitation = pick(ranges, CANDIDATES.precipitation, index);
    const cloud = pick(ranges, CANDIDATES.cloudCover, index);
    // KNMI has no condition field in this collection — infer from cloud/precip.
    const weatherCode =
      precipitation !== undefined && precipitation > 0.2
        ? WeatherCode.RAIN
        : cloud !== undefined && cloud >= 80
          ? WeatherCode.CLOUDY
          : cloud !== undefined && cloud >= 40
            ? WeatherCode.PARTLY_CLOUDY
            : WeatherCode.CLEAR;
    return {
      date: new Date(time),
      weatherCode,
      temperature: pick(ranges, CANDIDATES.temperature, index),
      windSpeed: windSpeedMs !== undefined ? windSpeedMs * 3.6 : undefined,
      windDirection: pick(ranges, CANDIDATES.windDirection, index),
      dewPoint: pick(ranges, CANDIDATES.dewPoint, index),
      precipitation,
      cloudCover: cloud,
      relativeHumidity: pick(ranges, CANDIDATES.humidity, index),
      uvIndex: pick(ranges, CANDIDATES.uv, index),
    };
  });

  return weatherFromHourly({
    hourly: hourlyFromSeries(rows, latitude, longitude),
    latitude,
    longitude,
    timezone,
    updatedAt: new Date(times[0]),
  });
}
