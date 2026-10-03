/**
 * Singapore — Meteorological Service Singapore (NEA) via data.gov.sg.
 *
 * Official, keyless. Uses the 4-day forecast for daily, the 2-hour forecast
 * for the nearest area's current condition, and the air-temperature /
 * relative-humidity station networks for current readings. Singapore has no
 * keyless warnings endpoint, so this source contributes no alerts.
 * https://data.gov.sg/
 */
import axios from 'axios';
import {Weather, Daily, HalfDay, Current} from '../types/weather';
import {mapConditionText, weatherTextFor, moonPhaseFor} from './weatherMapping';
import {getSunTimes, getDaylightDuration} from '../utils/sunCalc';

const SG_BASE = 'https://api.data.gov.sg/v1/environment';

interface SgForecastDay {
  date: string;
  forecast?: string;
  temperature?: {high?: number; low?: number};
  relative_humidity?: {high?: number; low?: number};
  wind?: {direction?: string; speed?: {low?: number; high?: number}};
}

interface SgStation {
  id: string;
  name?: string;
  location?: {latitude?: number; longitude?: number};
}

interface SgReading {
  station_id: string;
  value?: number;
}

function nearestReading(
  stations: SgStation[],
  readings: SgReading[],
  latitude: number,
  longitude: number,
): number | undefined {
  const byId = new Map(readings.map((r) => [r.station_id, r.value]));
  let best: number | undefined;
  let bestDist = Infinity;
  for (const station of stations) {
    const lat = station.location?.latitude;
    const lon = station.location?.longitude;
    if (lat === undefined || lon === undefined) continue;
    const dLat = lat - latitude;
    const dLon =
      (lon - longitude) * Math.cos(((lat + latitude) * Math.PI) / 360);
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = byId.get(station.id);
    }
  }
  return best;
}

async function fetchStationReadings(
  endpoint: string,
  latitude: number,
  longitude: number,
): Promise<number | undefined> {
  const response = await axios.get<{
    metadata?: {stations?: SgStation[]};
    items?: Array<{readings?: SgReading[]}>;
  }>(`${SG_BASE}/${endpoint}`);
  return nearestReading(
    response.data.metadata?.stations ?? [],
    response.data.items?.[0]?.readings ?? [],
    latitude,
    longitude,
  );
}

export async function fetchSgWeather(
  latitude: number,
  longitude: number,
  _timezone: string = 'Asia/Singapore',
): Promise<Weather | null> {
  const [fourDayRes, twoHourRes, temperature, humidity] = await Promise.all([
    axios.get<{items?: Array<{forecasts?: SgForecastDay[]}>}>(
      `${SG_BASE}/4-day-weather-forecast`,
    ),
    axios.get<{
      items?: Array<{forecasts?: Array<{area: string; forecast: string}>}>;
      area_metadata?: Array<{
        name: string;
        label_location?: {latitude?: number; longitude?: number};
      }>;
    }>(`${SG_BASE}/2-hour-weather-forecast`),
    fetchStationReadings('air-temperature', latitude, longitude).catch(
      () => undefined,
    ),
    fetchStationReadings('relative-humidity', latitude, longitude).catch(
      () => undefined,
    ),
  ]);

  const days = fourDayRes.data.items?.[0]?.forecasts ?? [];
  if (!days.length) return null;

  const dailyForecast: Daily[] = days.map((day) => {
    const date = new Date(`${day.date}T12:00:00+08:00`);
    const code = mapConditionText(day.forecast);
    const sun = getSunTimes(date, latitude, longitude);
    const dayPart: HalfDay = {
      weatherCode: code,
      weatherText: weatherTextFor(code),
      temperature: {temperature: day.temperature?.high},
    };
    const nightPart: HalfDay = {
      temperature: {temperature: day.temperature?.low},
    };
    return {
      date,
      day: dayPart,
      night: nightPart,
      sun: {riseTime: sun.sunrise, setTime: sun.sunset},
      moon: {phase: moonPhaseFor(date)},
      hoursOfSun: getDaylightDuration(date, latitude, longitude),
    };
  });

  // Current condition from the nearest 2-hour forecast area.
  const areas = twoHourRes.data.area_metadata ?? [];
  const forecasts = twoHourRes.data.items?.[0]?.forecasts ?? [];
  let condition: string | undefined;
  let bestDist = Infinity;
  for (const area of areas) {
    const lat = area.label_location?.latitude;
    const lon = area.label_location?.longitude;
    if (lat === undefined || lon === undefined) continue;
    const dLat = lat - latitude;
    const dLon =
      (lon - longitude) * Math.cos(((lat + latitude) * Math.PI) / 360);
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      condition = forecasts.find((f) => f.area === area.name)?.forecast;
    }
  }

  const currentCode = mapConditionText(condition);
  const current: Current | undefined = condition
    ? {
        weatherCode: currentCode,
        weatherText: condition,
        temperature: {temperature},
        relativeHumidity: humidity,
      }
    : undefined;

  return {
    base: {refreshTime: new Date(), mainUpdateTime: new Date()},
    current,
    hourlyForecast: [],
    dailyForecast,
  };
}
