import {Platform} from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import {Weather, WeatherCode, Location} from '../types/weather';
import {AppSettings, TemperatureUnit} from '../types/settings';

const APP_GROUP_IDENTIFIER = 'group.com.zephyrweather.shared';
const WEATHER_DATA_KEY = 'weatherData';
const LOCATIONS_LIST_KEY = 'locations';

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
}

interface SharedLocation {
  id: string;
  name: string;
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
    
    await SharedGroupPreferences.setItem(
      LOCATIONS_LIST_KEY,
      jsonData,
      APP_GROUP_IDENTIFIER
    );

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

    const jsonData = JSON.stringify(weatherDataMap);
    
    await SharedGroupPreferences.setItem(
      WEATHER_DATA_KEY,
      jsonData,
      APP_GROUP_IDENTIFIER
    );

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
    await SharedGroupPreferences.setItem(
      WEATHER_DATA_KEY,
      jsonData,
      APP_GROUP_IDENTIFIER
    );

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

  return {
    current: location.weather.current
      ? {
          temperature: location.weather.current.temperature?.temperature ?? null,
          feelsLike: location.weather.current.temperature?.apparent ?? null,
          weatherCode: convertWeatherCode(location.weather.current.weatherCode),
          weatherText: location.weather.current.weatherText ?? null,
          humidity: location.weather.current.relativeHumidity ?? null,
          windSpeed: location.weather.current.wind?.speed ?? null,
          isDaylight: location.weather.current.isDaylight ?? null,
        }
      : null,
    daily: location.weather.dailyForecast.slice(0, 7).map(day => ({
      date: day.date.toISOString(),
      dayTemp: day.day?.temperature?.temperature ?? null,
      nightTemp: day.night?.temperature?.temperature ?? null,
      dayWeatherCode: convertWeatherCode(day.day?.weatherCode),
      nightWeatherCode: convertWeatherCode(day.night?.weatherCode),
      dayWeatherText: day.day?.weatherText ?? null,
      precipProbability: day.day?.precipitationProbability?.total ?? null,
    })),
    hourly: location.weather.hourlyForecast.slice(0, 24).map(hour => ({
      date: hour.date.toISOString(),
      temperature: hour.temperature?.temperature ?? null,
      weatherCode: convertWeatherCode(hour.weatherCode),
      precipProbability: hour.precipitationProbability?.total ?? null,
      isDaylight: hour.isDaylight ?? null,
    })),
    locationName: location.city,
    temperatureUnit: settings?.temperatureUnit ?? 'fahrenheit',
  };
}
