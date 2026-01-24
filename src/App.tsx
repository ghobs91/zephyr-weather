import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './navigation/RootNavigator';
import {useWeatherStore} from './store/weatherStore';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useWeatherStore(state => state.settings.theme);
  
  const shouldUseDarkTheme = theme === 'dark' || (theme === 'system' && isDarkMode);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <NavigationContainer>
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
