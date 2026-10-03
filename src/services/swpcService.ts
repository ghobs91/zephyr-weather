/**
 * NOAA Space Weather Prediction Center (SWPC) — keyless space weather.
 *
 * Not an ensemble forecast source: this supplies geomagnetic/aurora context
 * that no national forecast API exposes. Data is text/JSON over HTTPS.
 * https://www.swpc.noaa.gov/content/data-access
 */
import axios from 'axios';
import {SpaceWeather} from '../types/weather';

const SWPC_BASE = 'https://services.swpc.noaa.gov';

interface KpObserved {
  time_tag: string;
  Kp: number;
}

interface KpForecast {
  time_tag: string;
  kp: number;
  observed: string;
}

interface SolarWindSpeed {
  proton_speed: number;
  time_tag: string;
}

/**
 * Rough equatorward boundary of visible aurora from the planetary K index.
 * Geomagnetic latitude scales ~2° per Kp step; this is an approximation for
 * display, not an official forecast.
 */
function auroraLatitudeFor(kp: number): number {
  return Math.max(30, Math.round((66.5 - 2 * kp) * 10) / 10);
}

export async function fetchSpaceWeather(): Promise<SpaceWeather | null> {
  const [observedRes, forecastRes, windRes] = await Promise.all([
    axios
      .get<KpObserved[]>(`${SWPC_BASE}/products/noaa-planetary-k-index.json`)
      .catch(() => null),
    axios
      .get<
        KpForecast[]
      >(`${SWPC_BASE}/products/noaa-planetary-k-index-forecast.json`)
      .catch(() => null),
    axios
      .get<
        SolarWindSpeed[]
      >(`${SWPC_BASE}/products/summary/solar-wind-speed.json`)
      .catch(() => null),
  ]);

  const observed = (observedRes?.data ?? []).filter(
    (row) => typeof row?.Kp === 'number',
  );
  if (!observed.length && !forecastRes?.data?.length) return null;

  const latest = observed[observed.length - 1];
  const kpIndex = latest?.Kp;

  const kpForecast = (forecastRes?.data ?? [])
    .filter((row) => typeof row?.kp === 'number')
    .map((row) => ({
      date: new Date(`${row.time_tag.replace(' ', 'T')}Z`),
      kp: row.kp,
      observed: row.observed === 'observed',
    }));

  const wind = windRes?.data?.[0];

  return {
    kpIndex,
    kpForecast: kpForecast.length ? kpForecast : undefined,
    auroraLatitude:
      kpIndex !== undefined ? auroraLatitudeFor(kpIndex) : undefined,
    solarWindSpeed: wind?.proton_speed,
    updatedAt: latest
      ? new Date(`${latest.time_tag.replace(' ', 'T')}Z`)
      : new Date(),
  };
}
