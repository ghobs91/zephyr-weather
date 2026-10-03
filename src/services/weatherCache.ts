import AsyncStorage from '@react-native-async-storage/async-storage';
import {Weather} from '../types/weather';

const CACHE_PREFIX = '@zephyr_weather_cache_';
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  weather: Weather;
  timestamp: number;
}

/**
 * Weather fields that are `Date` objects in memory but ISO strings once
 * JSON-serialized. Consumers (date-fns, `useTodayForecast`, `.toISOString()`
 * keys) assume real `Date`s, so these must be revived on read.
 */
const DATE_FIELDS = new Set([
  'date',
  'refreshTime',
  'mainUpdateTime',
  'airQualityUpdateTime',
  'pollenUpdateTime',
  'minutelyUpdateTime',
  'alertsUpdateTime',
  'normalsUpdateTime',
  'riseTime',
  'setTime',
  'startDate',
  'endDate',
  'time',
  'updatedAt',
]);

/** JSON.parse reviver that restores known date fields to `Date` objects. */
function reviveDateFields(key: string, value: unknown): unknown {
  if (typeof value === 'string' && DATE_FIELDS.has(key)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}

/**
 * Generates a cache key from coordinates (rounded to 2 decimal places
 * to allow minor GPS variance without cache misses).
 */
function cacheKey(latitude: number, longitude: number): string {
  const lat = Math.round(latitude * 100) / 100;
  const lon = Math.round(longitude * 100) / 100;
  return `${CACHE_PREFIX}${lat},${lon}`;
}

/**
 * Store weather data in the local cache.
 */
export async function cacheWeatherData(
  latitude: number,
  longitude: number,
  weather: Weather,
): Promise<void> {
  try {
    const entry: CacheEntry = {
      weather,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      cacheKey(latitude, longitude),
      JSON.stringify(entry),
    );
  } catch (err) {
    console.error('Failed to cache weather data:', err);
  }
}

/**
 * Retrieve cached weather data if it exists and is still fresh.
 * Returns null if no cache entry exists or it has expired.
 */
export async function getCachedWeatherData(
  latitude: number,
  longitude: number,
): Promise<Weather | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(latitude, longitude));
    if (!raw) return null;

    const entry: CacheEntry = JSON.parse(raw, reviveDateFields);
    const age = Date.now() - entry.timestamp;

    if (age > CACHE_MAX_AGE_MS) {
      // Expired — clean up
      await AsyncStorage.removeItem(cacheKey(latitude, longitude)).catch(
        () => {},
      );
      return null;
    }

    return entry.weather;
  } catch (err) {
    console.error('Failed to read cached weather data:', err);
    return null;
  }
}

/**
 * Clear all cached weather data.
 */
export async function clearWeatherCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (err) {
    console.error('Failed to clear weather cache:', err);
  }
}
