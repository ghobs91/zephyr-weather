import {Platform} from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import {Weather, WeatherCode, Location} from '../types/weather';
import {AppSettings, TemperatureUnit} from '../types/settings';

const APP_GROUP_IDENTIFIER = 'group.com.tempestweather.shared';
const WEATHER_DATA_KEY = 'weatherData';

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

export async function updateWidgetData(location: Location, settings?: AppSettings): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  if (!location.weather) {
    return;
  }

  try {
    const widgetData: WidgetWeatherData = {
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
