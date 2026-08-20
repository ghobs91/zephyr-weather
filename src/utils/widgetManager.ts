import {Platform, NativeModules} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Weather, WeatherCode, Location} from '../types/weather';
import {AppSettings, TemperatureUnit} from '../types/settings';

const APP_GROUP_IDENTIFIER = 'group.com.zephyrweather.shared';
const WEATHER_DATA_KEY = 'weatherData';
const LOCATIONS_LIST_KEY = 'locations';
const WIDGET_CACHE_KEY = '@zephyr_widget_weather_cache';

// Coalesce WidgetKit reloads so the first refresh happens immediately while
// rapid follow-up mutations stay within the iOS reload budget.
let pendingWidgetUpdate: ReturnType<typeof setTimeout> | null = null;
let lastWidgetReloadAt = 0;
const WIDGET_RELOAD_COOLDOWN_MS = 1500;

async function setSharedItem(key: string, value: string): Promise<void> {
  const bridge = NativeModules.ZephyrWidgetBridge;
  if (bridge) {
    await bridge.setItem(key, value, APP_GROUP_IDENTIFIER);
  } else {
    console.warn('[WidgetManager] ZephyrWidgetBridge not available');
  }
}

async function reloadWidgets(): Promise<void> {
  const bridge = NativeModules.ZephyrWidgetBridge;
  if (bridge?.reloadWidgets) {
    // Small delay to allow UserDefaults disk flush to complete.
    // synchronize() is a no-op on modern iOS, so we give the async
    // write time to land before WidgetKit reads from disk.
    await new Promise(resolve => setTimeout(resolve, 300));
    await bridge.reloadWidgets();
  }
}

function clearPendingWidgetReload(): void {
  if (pendingWidgetUpdate) {
    clearTimeout(pendingWidgetUpdate);
    pendingWidgetUpdate = null;
  }
}

// Writes data to the shared container immediately, then reloads widgets right
// away on the first update. Additional mutations within the cooldown window
// are coalesced into a single trailing reload.
function scheduleWidgetReload(): void {
  const now = Date.now();
  const nextReloadAllowedAt = lastWidgetReloadAt + WIDGET_RELOAD_COOLDOWN_MS;

  if (now >= nextReloadAllowedAt) {
    clearPendingWidgetReload();
    lastWidgetReloadAt = now;
    reloadWidgets().catch(err =>
      console.error('Failed to reload widgets:', err),
    );
    return;
  }

  clearPendingWidgetReload();
  pendingWidgetUpdate = setTimeout(() => {
    pendingWidgetUpdate = null;
    lastWidgetReloadAt = Date.now();
    reloadWidgets().catch(err =>
      console.error('Failed to reload widgets:', err),
    );
  }, nextReloadAllowedAt - now);
}

export const __widgetManagerTestUtils = {
  resetReloadScheduler(): void {
    clearPendingWidgetReload();
    lastWidgetReloadAt = 0;
  },
};

// Convert weather code from TypeScript format (PARTLY_CLOUDY) to Swift format (partly_cloudy)
function convertWeatherCode(code: string | null | undefined): string | null {
  if (!code) return null;
  // Convert PARTLY_CLOUDY -> partly_cloudy (just lowercase it)
  return code.toLowerCase();
}

interface WidgetWeatherData {
  current: {
    temperature: number | null;
    feelsLike: number | null;
    weatherCode: string | null;
    weatherText: string | null;
    humidity: number | null;
    windSpeed: number | null;
    isDaylight: boolean | null;
  } | null;
  daily: Array<{
    date: string; // ISO8601 string
    dayTemp: number | null;
    nightTemp: number | null;
    dayWeatherCode: string | null;
    nightWeatherCode: string | null;
    dayWeatherText: string | null;
    precipProbability: number | null;
  }>;
  hourly: Array<{
    date: string; // ISO8601 string
    temperature: number | null;
    weatherCode: string | null;
    precipProbability: number | null;
    isDaylight: boolean | null;
  }>;
  locationName: string;
  temperatureUnit: string;
  lastUpdated: string;
}

interface SharedLocation {
  id: string;
  name: string;
}

/**
 * Cache the weather data JSON string in AsyncStorage so it can be restored
 * on app re-launch, before new weather API data has finished loading.
 * This prevents the widget from going blank / showing mock data while the
 * user waits for a fresh forecast.
 */
async function cacheWidgetWeatherData(jsonData: string): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_CACHE_KEY, jsonData);
  } catch (err) {
    console.error('[WidgetManager] Failed to cache widget weather data:', err);
  }
}

/**
 * Restore cached widget weather data from AsyncStorage and push it into the
 * shared UserDefaults container. Call this during app rehydration so the
 * widget has *some* data to display even before the network fetch finishes.
 */
export async function restoreCachedWidgetData(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const cached = await AsyncStorage.getItem(WIDGET_CACHE_KEY);
    if (cached) {
      console.log('[WidgetManager] Restoring cached widget weather data');
      await setSharedItem(WEATHER_DATA_KEY, cached);
      // Route through the cooldown scheduler instead of calling reloadWidgets()
      // directly, so we don't double-reload when a fresh fetch completes shortly after.
      scheduleWidgetReload();
    } else {
      console.log('[WidgetManager] No cached widget weather data to restore');
    }
  } catch (err) {
    console.error('[WidgetManager] Error restoring cached widget data:', err);
  }
}

// Update the list of available locations for widget configuration
export async function updateLocationsList(locations: Location[]): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    const locationsList: SharedLocation[] = locations.map(loc => ({
      id: loc.id,
      name: loc.city || 'Unknown Location',
    }));

    const jsonData = JSON.stringify(locationsList);
    
    await setSharedItem(LOCATIONS_LIST_KEY, jsonData);

    console.log('Locations list updated successfully');
  } catch (error) {
    console.error('Error updating locations list:', error);
  }
}

// Update weather data for all locations
export async function updateAllLocationsWeatherData(
  locations: Location[],
  settings?: AppSettings
): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    // Update locations list first
    await updateLocationsList(locations);

    // Update weather data for each location
    const weatherDataMap: Record<string, WidgetWeatherData> = {};

    for (const location of locations) {
      if (location.weather) {
        weatherDataMap[location.id] = createWidgetWeatherData(location, settings);
      }
    }

    if (Object.keys(weatherDataMap).length > 0) {
      const jsonData = JSON.stringify(weatherDataMap);
      console.log('[WidgetManager] Writing weather data map with keys:', Object.keys(weatherDataMap), 'size:', jsonData.length);
      await setSharedItem(WEATHER_DATA_KEY, jsonData);
      // Cache for later rehydration
      await cacheWidgetWeatherData(jsonData);
      scheduleWidgetReload();
    }

    console.log('All locations weather data updated successfully');
  } catch (error) {
    console.error('Error updating all locations weather data:', error);
  }
}

// Update widget data for a single location (backward compatibility)
export async function updateWidgetData(location: Location, settings?: AppSettings): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  if (!location.weather) {
    return;
  }

  try {
    const widgetData = createWidgetWeatherData(location, settings);
    const jsonData = JSON.stringify(widgetData);
    
    // Write to shared container as JSON file
    await setSharedItem(WEATHER_DATA_KEY, jsonData);
    // Cache for later rehydration
    await cacheWidgetWeatherData(jsonData);
    scheduleWidgetReload();

    console.log('Widget data updated successfully');
  } catch (error) {
    console.error('Error updating widget data:', error);
  }
}

// Helper function to create widget weather data from location
function createWidgetWeatherData(location: Location, settings?: AppSettings): WidgetWeatherData {
  if (!location.weather) {
    throw new Error('Location has no weather data');
  }

  const unit = settings?.temperatureUnit ?? 'fahrenheit';

  // Convert from canonical Celsius to user's preferred display unit
  const toUnit = (celsius: number | null | undefined): number | null => {
    if (celsius === null || celsius === undefined) return null;
    return unit === 'fahrenheit'
      ? Math.round(celsius * 9 / 5 + 32)
      : Math.round(celsius);
  };

  return {
    current: location.weather.current
      ? {
          temperature: toUnit(location.weather.current.temperature?.temperature),
          feelsLike: toUnit(location.weather.current.temperature?.apparent),
          weatherCode: convertWeatherCode(location.weather.current.weatherCode),
          weatherText: location.weather.current.weatherText ?? null,
          humidity: location.weather.current.relativeHumidity ?? null,
          windSpeed: location.weather.current.wind?.speed ?? null,
          isDaylight: location.weather.current.isDaylight ?? null,
        }
      : null,
    daily: (() => {
      // Send up to 10 days of forecast WITHOUT timezone-dependent filtering.
      // The widget's Swift code already filters daily entries to only show
      // "today and future" days using the device's local calendar, so we
      // don't need to pre-filter here. Sending extra days ensures the
      // widget has data even if there's a timezone mismatch between
      // write time and read time.
      return location.weather.dailyForecast
        .slice(0, 10)
        .map(day => ({
          date: day.date.toISOString(),
          dayTemp: toUnit(day.day?.temperature?.temperature),
          nightTemp: toUnit(day.night?.temperature?.temperature),
          dayWeatherCode: convertWeatherCode(day.day?.weatherCode),
          nightWeatherCode: convertWeatherCode(day.night?.weatherCode),
          dayWeatherText: day.day?.weatherText ?? null,
          precipProbability: day.day?.precipitationProbability?.total ?? null,
        }));
    })(),
    hourly: (() => {
      // Send up to 48 hours of forecast data starting from the beginning
      // of the current hour. This ensures the widget always has "Now"
      // data and doesn't go stale within an hour of write time.
      // The widget's Swift code handles its own "upcoming hours" filtering.
      const now = new Date();
      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);
      return location.weather.hourlyForecast
        .filter(hour => {
          const hourStart = new Date(hour.date);
          hourStart.setMinutes(0, 0, 0);
          return hourStart.getTime() >= currentHourStart.getTime();
        })
        .slice(0, 48)
        .map(hour => ({
          date: hour.date.toISOString(),
          temperature: toUnit(hour.temperature?.temperature),
          weatherCode: convertWeatherCode(hour.weatherCode),
          precipProbability: hour.precipitationProbability?.total ?? null,
          isDaylight: hour.isDaylight ?? null,
        }));
    })(),
    locationName: location.city ?? 'Unknown Location',
    temperatureUnit: unit,
    lastUpdated: new Date().toISOString(),
  };
}


