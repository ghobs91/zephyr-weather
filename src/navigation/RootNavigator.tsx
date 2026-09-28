import React, {useEffect, useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {TouchableOpacity} from 'react-native';

import {HomeScreen} from '../screens/HomeScreen';
import {MacOSHomeScreen} from '../screens/MacOSHomeScreen';
import {RadarScreen} from '../screens/RadarScreen';
import {SearchLocationScreen} from '../screens/SearchLocationScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {DailyDetailScreen} from '../screens/DailyDetailScreen';
import {AlertsScreen} from '../screens/AlertsScreen';
import {LocationsScreen} from '../screens/LocationsScreen';
import {OnboardingScreen} from '../screens/OnboardingScreen';
import {useWeatherStore} from '../store/weatherStore';
import {useThemeColors} from '../hooks/useThemeColors';
import {isMacOS} from '../utils/platformDetect';

export type RootStackParamList = {
  MainTabs: undefined;
  Onboarding: undefined;
  Radar: undefined;
  DailyDetail: {dayIndex: number};
  SearchLocation: undefined;
  Alerts: undefined;
  Locations: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {useDark, themeColors} = useThemeColors();
  const isDesktop = isMacOS();
  const locations = useWeatherStore((s) => s.locations);
  const hasCompletedOnboarding = useWeatherStore(
    (s) => s.hasCompletedOnboarding,
  );

  // Don't decide on onboarding until persisted state rehydrates —
  // otherwise existing users flash the onboarding on every launch.
  const [hydrated, setHydrated] = useState(
    useWeatherStore.persist.hasHydrated(),
  );
  useEffect(() => {
    // Re-check here: with empty storage rehydration can finish between the
    // first render and this effect, in which case onFinishHydration never
    // fires again and the app would stay stuck on a blank screen.
    if (useWeatherStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useWeatherStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  if (!hydrated) return null;

  // First-run gate: fresh installs (no saved locations) see onboarding.
  // Existing installs always have locations, so they never regress here.
  const showOnboarding = !hasCompletedOnboarding && locations.length === 0;

  return (
    <Stack.Navigator
      initialRouteName={showOnboarding ? 'Onboarding' : 'MainTabs'}
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerBlurEffect: useDark
          ? 'systemChromeMaterialDark'
          : 'systemChromeMaterialLight',
        headerTintColor: themeColors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: themeColors.background,
        },
      }}>
      <Stack.Screen
        name="MainTabs"
        component={isDesktop ? MacOSHomeScreen : HomeScreen}
        options={{headerShown: false}}
      />
      {showOnboarding && (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{headerShown: false}}
        />
      )}
      <Stack.Screen
        name="Radar"
        component={RadarScreen}
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="DailyDetail"
        component={DailyDetailScreen}
        options={{
          title: 'Forecast Detail',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="SearchLocation"
        component={SearchLocationScreen}
        options={({navigation}) => ({
          title: 'Add Location',
          presentation: isDesktop ? 'formSheet' : 'modal',
          gestureEnabled: true,
          headerShown: true,
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{paddingHorizontal: 16, paddingVertical: 8}}>
              <Icon name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Weather Alerts',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Locations"
        component={LocationsScreen}
        options={{
          title: 'Locations',
          headerBackTitle: 'Back',
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}
