import {useColorScheme} from 'react-native';
import {useWeatherStore} from '../store/weatherStore';
import {colors, ColorTheme} from '../theme/colors';

/**
 * Shared hook that resolves the current theme based on user settings
 * and system color scheme. Eliminates 3 lines of boilerplate from every screen.
 */
export function useThemeColors(): {useDark: boolean; themeColors: ColorTheme} {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useWeatherStore(state => state.settings.theme);
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  return {
    useDark,
    themeColors: useDark ? colors.dark : colors.light,
  };
}
