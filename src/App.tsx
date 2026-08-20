import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {DarkTheme, DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './navigation/RootNavigator';
import {useWeatherStore} from './store/weatherStore';
import {getThemeColors} from './theme/design';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useWeatherStore(state => state.settings.theme);
  
  const shouldUseDarkTheme = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = getThemeColors(shouldUseDarkTheme);
  const navigationTheme = {
    ...(shouldUseDarkTheme ? DarkTheme : DefaultTheme),
    colors: {
      ...(shouldUseDarkTheme ? DarkTheme.colors : DefaultTheme.colors),
      primary: themeColors.primary,
      background: 'transparent',
      card: themeColors.surface,
      text: themeColors.text,
      border: 'transparent',
      notification: themeColors.secondary,
    },
  };

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar
            barStyle={shouldUseDarkTheme ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent
          />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
