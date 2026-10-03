/**
 * Météo-France — national forecast for France.
 *
 * Authentication: a single API key obtained from the portal and sent in the
 * `apikey` header. Confirmed against public-api.meteofrance.fr, whose 401
 * message accepts `apikey`, `Authorization: Bearer`, or `Authorization: Basic`.
 *
 * UNVERIFIED (endpoint): the forecast resource path is not yet confirmed
 * against the subscribed "prévision" API product — Météo-France's public API is
 * organised per product (e.g. DPObs is observations, DPClim is climate). The
 * URL below must be corrected once the key is available; until then any failure
 * degrades to null and the app falls back to Open-Meteo.
 * https://portail-api.meteofrance.fr/
 */
import axios from 'axios';
import {Weather} from '../types/weather';
import {apiKeys, hasApiKey} from '../config/apiKeys';
import {
  hourlyFromSeries,
  weatherFromHourly,
  mapConditionText,
  HourlySeriesInput,
} from './weatherMapping';

// TODO: confirm the prévision product slug/path (DPObs is observations-only).
const FORECAST_URL =
  'https://public-api.meteofrance.fr/public/DPForecast/v1/forecast';

interface MeteoFrancePoint {
  time?: string;
  validity_time?: string;
  temperature?: number;
  air_temperature?: number;
  wind_speed?: number;
  wind_direction?: number;
  precipitation?: number;
  precipitation_amount?: number;
  relative_humidity?: number;
  cloud_cover?: number;
  weather?: string;
}

export async function fetchMeteoFranceWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'Europe/Paris',
): Promise<Weather | null> {
  if (!hasApiKey('meteoFrance')) return null;

  const response = await axios.get<
    MeteoFrancePoint[] | {forecast?: MeteoFrancePoint[]}
  >(FORECAST_URL, {
    params: {lat: latitude, lon: longitude},
    headers: {apikey: apiKeys.meteoFranceApiKey, accept: 'application/json'},
  });

  const series = Array.isArray(response.data)
    ? response.data
    : (response.data?.forecast ?? []);

  const rows: HourlySeriesInput[] = series
    .filter((point) => point.time ?? point.validity_time)
    .map((point) => {
      const wind = point.wind_speed;
      return {
        date: new Date((point.time ?? point.validity_time) as string),
        weatherCode: mapConditionText(point.weather),
        temperature: point.temperature ?? point.air_temperature,
        // Météo-France reports wind in m/s.
        windSpeed: wind !== undefined ? wind * 3.6 : undefined,
        windDirection: point.wind_direction,
        precipitation: point.precipitation ?? point.precipitation_amount,
        relativeHumidity: point.relative_humidity,
        cloudCover: point.cloud_cover,
      };
    })
    .filter((row) => !Number.isNaN(row.date.getTime()));

  if (!rows.length) return null;
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  return weatherFromHourly({
    hourly: hourlyFromSeries(rows, latitude, longitude),
    latitude,
    longitude,
    timezone,
    updatedAt: new Date(rows[0].date),
  });
}
