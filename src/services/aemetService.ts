/**
 * AEMET (Spain) — national forecast for Spain.
 *
 * UNVERIFIED: uses the OpenData "predicción por municipios (horaria)" dataset.
 * AEMET returns a pre-signed `datos` URL that must be fetched in a second
 * request, and lat/lon is resolved to the nearest municipality from its
 * catalogue (cached for 90 days). Confirm field/period shapes against a live
 * response once AEMET_API_KEY is set.
 * https://opendata.aemet.es/
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Weather, WeatherCode} from '../types/weather';
import {apiKeys, hasApiKey} from '../config/apiKeys';
import {
  hourlyFromSeries,
  weatherFromHourly,
  HourlySeriesInput,
} from './weatherMapping';

const AEMET_BASE = 'https://opendata.aemet.es/opendata/api';
const MUNICIPIOS_CACHE_KEY = '@zephyr_aemet_municipios_v1';
const MUNICIPIOS_TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface Municipio {
  id: string;
  nombre?: string;
  latitud?: string;
  longitud?: string;
}

/** Parses AEMET coordinates, which may be decimal or sexagesimal. */
function parseCoord(raw?: string): number | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
  const match = normalized.match(
    /(\d+)[°º]\s*(\d+)?['′]?\s*([\d.]+)?["″]?\s*([NSEWnsew])?/,
  );
  if (!match) return undefined;
  const deg = Number(match[1]);
  const min = Number(match[2] ?? 0);
  const sec = Number(match[3] ?? 0);
  let value = deg + min / 60 + sec / 3600;
  const hemisphere = match[4];
  if (hemisphere && /[SWsw]/.test(hemisphere)) value = -value;
  return value;
}

/** Follows AEMET's two-step `datos` URL indirection. */
async function fetchDatos<T>(endpoint: string): Promise<T | null> {
  const first = await axios.get<{datos?: string}>(endpoint, {
    params: {api_key: apiKeys.aemet},
  });
  if (!first.data?.datos) return null;
  const second = await axios.get<T>(first.data.datos);
  return second.data;
}

async function getMunicipios(): Promise<Municipio[]> {
  try {
    const raw = await AsyncStorage.getItem(MUNICIPIOS_CACHE_KEY);
    if (raw) {
      const cached: {timestamp: number; municipios: Municipio[]} =
        JSON.parse(raw);
      if (Date.now() - cached.timestamp < MUNICIPIOS_TTL_MS) {
        return cached.municipios;
      }
    }
  } catch {
    // Fall through to a network fetch.
  }
  const municipios =
    (await fetchDatos<Municipio[]>(`${AEMET_BASE}/maestro/municipios`)) ?? [];
  AsyncStorage.setItem(
    MUNICIPIOS_CACHE_KEY,
    JSON.stringify({timestamp: Date.now(), municipios}),
  ).catch(() => {});
  return municipios;
}

function nearestMunicipio(
  municipios: Municipio[],
  latitude: number,
  longitude: number,
): Municipio | null {
  let best: Municipio | null = null;
  let bestDist = Infinity;
  for (const municipio of municipios) {
    const lat = parseCoord(municipio.latitud);
    const lon = parseCoord(municipio.longitud);
    if (lat === undefined || lon === undefined) continue;
    const dLat = lat - latitude;
    const dLon =
      (lon - longitude) * Math.cos(((lat + latitude) * Math.PI) / 360);
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = municipio;
    }
  }
  return best;
}

function mapAemetSky(description: string | undefined): WeatherCode {
  if (!description) return WeatherCode.CLEAR;
  const text = description.toLowerCase();
  if (text.includes('tormenta')) return WeatherCode.THUNDERSTORM;
  if (text.includes('nieve')) return WeatherCode.SNOW;
  if (text.includes('lluvia') || text.includes('chubasco')) {
    if (/fuerte|intensa/.test(text)) return WeatherCode.RAIN_HEAVY;
    return WeatherCode.RAIN;
  }
  if (text.includes('niebla')) return WeatherCode.FOG;
  if (text.includes('cubierto') || text.includes('nuboso')) {
    if (text.includes('poco')) return WeatherCode.PARTLY_CLOUDY;
    return WeatherCode.CLOUDY;
  }
  if (text.includes('intervalos')) return WeatherCode.PARTLY_CLOUDY;
  if (text.includes('despejado')) return WeatherCode.CLEAR;
  return WeatherCode.CLEAR;
}

interface AemetPeriod {
  periodo?: string;
  value?: number | string;
  descripcion?: string;
  direccion?: Array<number | string>;
  velocidad?: Array<number | string>;
}

interface AemetDay {
  fecha?: string;
  temperatura?: AemetPeriod[];
  humedadRelativa?: AemetPeriod[];
  probPrecipitacion?: AemetPeriod[];
  precipitacion?: AemetPeriod[];
  estadoCielo?: AemetPeriod[];
  vientoAndRachaMax?: AemetPeriod[];
}

function byPeriod(list: AemetPeriod[] | undefined): Map<string, AemetPeriod> {
  const map = new Map<string, AemetPeriod>();
  (list ?? []).forEach((item) => {
    if (item.periodo) map.set(item.periodo, item);
  });
  return map;
}

function num(value: number | string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function fetchAemetWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'Europe/Madrid',
): Promise<Weather | null> {
  if (!hasApiKey('aemet')) return null;

  const municipios = await getMunicipios();
  const municipio = nearestMunicipio(municipios, latitude, longitude);
  if (!municipio) return null;

  const code = municipio.id.replace(/^id/, '');
  const days = await fetchDatos<Array<{prediccion?: {dia?: AemetDay[]}}>>(
    `${AEMET_BASE}/prediccion/especifica/municipio/horaria/${code}`,
  );
  const forecastDays = days?.[0]?.prediccion?.dia ?? [];

  const rows: HourlySeriesInput[] = [];
  forecastDays.slice(0, 2).forEach((day) => {
    if (!day.fecha) return;
    const base = day.fecha.slice(0, 10);
    const temps = byPeriod(day.temperatura);
    const humidity = byPeriod(day.humedadRelativa);
    const pops = byPeriod(day.probPrecipitacion);
    const precip = byPeriod(day.precipitacion);
    const sky = byPeriod(day.estadoCielo);

    temps.forEach((entry, hour) => {
      const date = new Date(`${base}T${String(hour).padStart(2, '0')}:00:00`);
      if (Number.isNaN(date.getTime())) return;
      rows.push({
        date,
        weatherCode: mapAemetSky(sky.get(String(hour))?.descripcion),
        temperature: num(entry.value),
        relativeHumidity: num(humidity.get(String(hour))?.value),
        precipitationProbability: num(pops.get(String(hour))?.value),
        precipitation: num(precip.get(String(hour))?.value),
      });
    });
  });

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
