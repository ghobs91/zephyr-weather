/**
 * NOAA Center for Operational Oceanographic Products and Services (CO-OPS) —
 * keyless tide predictions for US coastal waters.
 *
 * Not an ensemble forecast source: supplies high/low tide times and heights
 * used by the location detail screens. The station catalogue (~3,500 entries)
 * has no lat/lon query, so it is cached locally for a month.
 * https://api.tidesandcurrents.noaa.gov/api/prod/
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Tides, TidePrediction} from '../types/weather';

const COOPS_BASE = 'https://api.tidesandcurrents.noaa.gov';
const STATIONS_CACHE_KEY = '@zephyr_coops_stations_v1';
const STATIONS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DISTANCE_DEG = 1.5;

interface CoopsStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface StationsCache {
  timestamp: number;
  stations: CoopsStation[];
}

function haversineSq(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = lat1 - lat2;
  const dLon = (lon1 - lon2) * Math.cos(((lat1 + lat2) * Math.PI) / 360);
  return dLat * dLat + dLon * dLon;
}

async function getStations(): Promise<CoopsStation[]> {
  try {
    const raw = await AsyncStorage.getItem(STATIONS_CACHE_KEY);
    if (raw) {
      const cached: StationsCache = JSON.parse(raw);
      if (Date.now() - cached.timestamp < STATIONS_TTL_MS) {
        return cached.stations;
      }
    }
  } catch {
    // Fall through to a network fetch.
  }

  const response = await axios.get<{stations?: CoopsStation[]}>(
    `${COOPS_BASE}/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english`,
  );
  const stations = (response.data.stations ?? []).filter(
    (s) => typeof s.lat === 'number' && typeof s.lng === 'number',
  );
  AsyncStorage.setItem(
    STATIONS_CACHE_KEY,
    JSON.stringify({timestamp: Date.now(), stations} satisfies StationsCache),
  ).catch(() => {});
  return stations;
}

function nearestStation(
  stations: CoopsStation[],
  latitude: number,
  longitude: number,
): CoopsStation | null {
  let best: CoopsStation | null = null;
  let bestDist = Infinity;
  for (const station of stations) {
    const dist = haversineSq(latitude, longitude, station.lat, station.lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = station;
    }
  }
  if (!best || Math.sqrt(bestDist) > MAX_DISTANCE_DEG) return null;
  return best;
}

function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

interface CoopsPrediction {
  t: string;
  v: string;
  type: 'H' | 'L';
}

export async function fetchTides(
  latitude: number,
  longitude: number,
): Promise<Tides | null> {
  try {
    const stations = await getStations();
    const station = nearestStation(stations, latitude, longitude);
    if (!station) return null;

    const response = await axios.get<{
      predictions?: CoopsPrediction[];
      error?: {message?: string};
    }>(`${COOPS_BASE}/api/prod/datagetter`, {
      params: {
        product: 'predictions',
        application: 'ZephyrWeather',
        begin_date: yyyymmdd(new Date()),
        range: 48,
        datum: 'MLLW',
        station: station.id,
        time_zone: 'lst_ldt',
        units: 'english',
        interval: 'hilo',
        format: 'json',
      },
    });

    if (!response.data.predictions) return null;

    const predictions: TidePrediction[] = response.data.predictions
      .map((p) => ({
        time: new Date(p.t.replace(' ', 'T')),
        height: Number(p.v),
        type: p.type === 'H' ? ('high' as const) : ('low' as const),
      }))
      .filter(
        (p) => !Number.isNaN(p.time.getTime()) && !Number.isNaN(p.height),
      );

    if (!predictions.length) return null;

    return {
      stationId: station.id,
      stationName: station.name,
      units: 'ft',
      predictions,
      updatedAt: new Date(),
    };
  } catch {
    return null;
  }
}
