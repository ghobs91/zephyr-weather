import {ImageSourcePropType} from 'react-native';
import {WeatherCode} from '../types/weather';

export type WeatherBackgroundKey =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'overcast'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog';

/** Full-screen condition backdrops. Cloudless blue sky through misty peaks. */
export const WEATHER_BACKGROUNDS: Record<
  WeatherBackgroundKey,
  ImageSourcePropType
> = {
  'clear-day': require('../assets/backgrounds/clear-day.jpg'),
  'clear-night': require('../assets/backgrounds/clear-night.jpg'),
  'partly-cloudy-day': require('../assets/backgrounds/partly-cloudy-day.jpg'),
  'partly-cloudy-night': require('../assets/backgrounds/partly-cloudy-night.jpg'),
  overcast: require('../assets/backgrounds/overcast.jpg'),
  rain: require('../assets/backgrounds/rain.jpg'),
  thunderstorm: require('../assets/backgrounds/thunderstorm.jpg'),
  snow: require('../assets/backgrounds/snow.jpg'),
  fog: require('../assets/backgrounds/fog.jpg'),
};

/** Backgrounds that stay bright in daylight and pair with the light material. */
const LIGHT_BACKGROUNDS: ReadonlySet<WeatherBackgroundKey> = new Set([
  'clear-day',
  'partly-cloudy-day',
  'snow',
  'fog',
]);

/**
 * Maps a provider weather code + daylight flag onto a bundled backdrop.
 * Unknown codes fall back to the overcast sky.
 */
export function getWeatherBackgroundKey(
  code?: WeatherCode,
  isDaylight?: boolean,
): WeatherBackgroundKey {
  const isDay = isDaylight !== false;
  switch (code) {
    case WeatherCode.CLEAR:
      return isDay ? 'clear-day' : 'clear-night';
    case WeatherCode.PARTLY_CLOUDY:
      return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
    case WeatherCode.RAIN_LIGHT:
    case WeatherCode.RAIN:
    case WeatherCode.RAIN_HEAVY:
      return 'rain';
    case WeatherCode.SNOW_LIGHT:
    case WeatherCode.SNOW:
    case WeatherCode.SNOW_HEAVY:
    case WeatherCode.SLEET:
      return 'snow';
    case WeatherCode.HAIL:
    case WeatherCode.THUNDERSTORM:
      return 'thunderstorm';
    case WeatherCode.FOG:
    case WeatherCode.HAZE:
      return 'fog';
    case WeatherCode.WIND:
    case WeatherCode.CLOUDY:
    default:
      return 'overcast';
  }
}

export function getWeatherBackgroundSource(
  key: WeatherBackgroundKey,
): ImageSourcePropType {
  return WEATHER_BACKGROUNDS[key];
}

/**
 * Whether the condition should drive the dark material. Bright day skies
 * use the light glass; storms, nights, rain and cloud use the dark glass.
 */
export function isWeatherBackgroundDark(
  key: WeatherBackgroundKey,
  isDaylight?: boolean,
): boolean {
  if (isDaylight === false) return true;
  return !LIGHT_BACKGROUNDS.has(key);
}
