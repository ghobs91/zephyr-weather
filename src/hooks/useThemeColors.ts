import {useColorScheme} from 'react-native';
import {useWeatherStore} from '../store/weatherStore';
import {colors, ColorTheme} from '../theme/colors';
import {
  getWeatherBackgroundKey,
  isWeatherBackgroundDark,
  WeatherBackgroundKey,
} from '../utils/weatherBackgrounds';

interface ThemeState {
  useDark: boolean;
  themeColors: ColorTheme;
  backgroundKey: WeatherBackgroundKey;
}

/**
 * Resolves the app theme from the current condition and time of day, the
 * way a weather app should: bright skies get the light material, storms and
 * nights get the dark one. An explicit light/dark preference in Settings
 * wins over the condition; `system` defers to the condition, falling back to
 * the OS colour scheme while weather is still loading.
 */
export function useThemeColors(): ThemeState {
  const isSystemDark = useColorScheme() === 'dark';
  const theme = useWeatherStore(state => state.settings.theme);
  const weatherCode = useWeatherStore(
    state =>
      state.locations[state.currentLocationIndex]?.weather?.current?.weatherCode,
  );
  const isDaylight = useWeatherStore(
    state =>
      state.locations[state.currentLocationIndex]?.weather?.current?.isDaylight,
  );

  const backgroundKey = getWeatherBackgroundKey(weatherCode, isDaylight);
  const hasWeather = weatherCode !== undefined;
  const conditionDark = isWeatherBackgroundDark(backgroundKey, isDaylight);

  const useDark =
    theme === 'dark' ||
    (theme === 'system' && (hasWeather ? conditionDark : isSystemDark));

  return {
    useDark,
    themeColors: useDark ? colors.dark : colors.light,
    backgroundKey,
  };
}
