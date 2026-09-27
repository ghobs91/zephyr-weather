import React from 'react';
import {StatusBar} from 'react-native';
import {DarkTheme, DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './navigation/RootNavigator';
import {useThemeColors} from './hooks/useThemeColors';

function App(): React.JSX.Element {
  const {useDark: shouldUseDarkTheme, themeColors} = useThemeColors();
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
