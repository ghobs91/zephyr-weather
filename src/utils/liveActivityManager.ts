import {Platform, NativeModules} from 'react-native';
import {Location, WeatherCode} from '../types/weather';
import {TemperatureUnit} from '../types/settings';
import {useWeatherStore} from '../store/weatherStore';
import {formatTemp} from './formatting';

/**
 * Live Activity plumbing (iOS Lock Screen + Dynamic Island).
 *
 * The native side (ZephyrLiveActivityManager.swift, single-activity
 * model) starts/updates/ends from preformatted JSON — all unit
 * conversion and SF Symbol mapping happen here so Swift stays dumb.
 * Local updates only; no push tokens involved.
 */

export interface LiveActivityPayload {
  locationId: string;
  temperature: string;
  weatherText: string;
  highTemp: string;
  lowTemp: string;
  locationName: string;
  sfSymbol: string;
}

// Mirrors WeatherCode.sfSymbol in the widget extension.
const SF_SYMBOLS: Record<string, string> = {
  [WeatherCode.CLEAR]: 'sun.max.fill',
  [WeatherCode.PARTLY_CLOUDY]: 'cloud.sun.fill',
  [WeatherCode.CLOUDY]: 'cloud.fill',
  [WeatherCode.RAIN_LIGHT]: 'cloud.drizzle.fill',
  [WeatherCode.RAIN]: 'cloud.rain.fill',
  [WeatherCode.RAIN_HEAVY]: 'cloud.heavyrain.fill',
  [WeatherCode.SNOW_LIGHT]: 'cloud.snow.fill',
  [WeatherCode.SNOW]: 'cloud.snow.fill',
  [WeatherCode.SNOW_HEAVY]: 'snowflake',
  [WeatherCode.SLEET]: 'cloud.sleet.fill',
  [WeatherCode.HAIL]: 'cloud.sleet.fill',
  [WeatherCode.THUNDERSTORM]: 'cloud.bolt.rain.fill',
  [WeatherCode.FOG]: 'cloud.fog.fill',
  [WeatherCode.HAZE]: 'cloud.fog.fill',
  [WeatherCode.WIND]: 'wind',
};

export function weatherCodeToSFSymbol(code?: WeatherCode): string {
  if (!code) return 'cloud.fill';
  return SF_SYMBOLS[code] ?? 'cloud.fill';
}

export function buildLiveActivityPayload(
  location: Location,
  temperatureUnit: TemperatureUnit,
): LiveActivityPayload | null {
  const current = location.weather?.current;
  if (!current) return null;

  const today = location.weather?.dailyForecast?.[0];

  return {
    locationId: location.id,
    temperature: formatTemp(current.temperature?.temperature, temperatureUnit),
    weatherText: current.weatherText ?? 'Unknown',
    highTemp: formatTemp(today?.day?.temperature?.temperature, temperatureUnit),
    lowTemp: formatTemp(today?.night?.temperature?.temperature, temperatureUnit),
    locationName: location.city ?? 'Current Location',
    sfSymbol: weatherCodeToSFSymbol(current.weatherCode),
  };
}

function bridge() {
  if (Platform.OS !== 'ios') return undefined;
  return NativeModules.ZephyrWidgetBridge;
}

/**
 * Reconcile the Live Activity with the selected location's weather:
 * update when active, start when missing, end when disabled/dataless.
 * Safe to call after every refresh — no-ops without the native bridge.
 */
export async function syncLiveActivity(): Promise<void> {
  const b = bridge();
  if (!b?.startLiveActivity) return;

  const {locations, currentLocationIndex, settings} = useWeatherStore.getState();
  const location = locations[currentLocationIndex];

  if (!settings.liveActivityEnabled || !location?.weather?.current) {
    try {
      await b.endLiveActivity?.();
    } catch {
      // Ending is best-effort; a stale activity expires on its own.
    }
    return;
  }

  const payload = buildLiveActivityPayload(location, settings.temperatureUnit);
  if (!payload) return;

  try {
    const active = await b.isLiveActivityActive();
    if (active) {
      await b.updateLiveActivity(JSON.stringify(payload));
    } else {
      await b.startLiveActivity(JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('[LiveActivity] sync failed:', err);
  }
}

export async function endLiveActivity(): Promise<void> {
  const b = bridge();
  if (!b?.endLiveActivity) return;
  try {
    await b.endLiveActivity();
  } catch (err) {
    console.warn('[LiveActivity] end failed:', err);
  }
}
