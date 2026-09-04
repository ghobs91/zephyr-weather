import React, {useEffect, useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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
import {t} from '../i18n';
import type {StringKey} from '../i18n';
import {useThemeColors} from '../hooks/useThemeColors';
import {colors} from '../theme/colors';
import {getGlassPillStyle, withAlpha} from '../theme/design';
import {isMacOS} from '../utils/platformDetect';

export type RootStackParamList = {
  MainTabs: undefined;
  Onboarding: undefined;
  DailyDetail: {dayIndex: number};
  SearchLocation: undefined;
  Alerts: undefined;
  Locations: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Radar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_CONFIG: Record<string, {icon: string}> = {
  Home: {icon: 'weather-partly-cloudy'},
  Radar: {icon: 'radar'},
};

const TAB_LABELS: Record<string, StringKey> = {
  Home: 'tabs.weather',
  Radar: 'tabs.radar',
};

function GlassPill({children, style, useDark, themeColors}: {children: React.ReactNode; style?: any; useDark: boolean; themeColors: typeof colors.light}) {
  return (
    <View style={[tabBarStyles.glassPill, getGlassPillStyle(themeColors), style]}>
      {/* Front-light shimmer */}
      <View style={[tabBarStyles.glassShimmer, {backgroundColor: withAlpha('#FFFFFF', useDark ? 0.06 : 0.28)}]} />
      <View style={tabBarStyles.glassContent}>{children}</View>
    </View>
  );
}

function CustomTabBar({state, navigation}: any) {
  const {useDark, themeColors} = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[tabBarStyles.container, {paddingBottom: (insets.bottom || 12) + 4}]}
      pointerEvents="box-none">
      {/* Left pill: Weather + Radar */}
      <GlassPill useDark={useDark} themeColors={themeColors}>
        {state.routes.map((route: any, index: number) => {
          const config = TAB_CONFIG[route.name];
          const labelKey = TAB_LABELS[route.name];
          if (!config || !labelKey) return null;
          const label = t(labelKey);
          const isFocused = state.index === index;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              accessibilityRole="button"
              accessibilityLabel={`${label} tab`}
              accessibilityState={{selected: isFocused}}
              style={[
                tabBarStyles.tabButton,
                isFocused && {backgroundColor: withAlpha(themeColors.primary, 0.9)},
              ]}>
              <Icon
                name={config.icon}
                size={22}
                color={isFocused ? '#FFFFFF' : themeColors.textSecondary}
              />
              <Text
                style={[
                  tabBarStyles.tabLabel,
                  {color: isFocused ? '#FFFFFF' : themeColors.textSecondary},
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </GlassPill>

      {/* Right pill: Search */}
      <GlassPill useDark={useDark} themeColors={themeColors}>
        <TouchableOpacity
          onPress={() => navigation.navigate('SearchLocation')}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.search')}
          style={tabBarStyles.searchButton}>
          <Icon name="magnify" size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </GlassPill>
    </View>
  );
}

// Outer pill radius = 26, content padding = 5, so inner button radius = 26 - 5 = 21
const PILL_RADIUS = 28;
const PILL_PADDING = 4;
const BTN_RADIUS = PILL_RADIUS - PILL_PADDING;

const tabBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  glassPill: {
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
  },
  glassShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: PILL_RADIUS,
    borderTopRightRadius: PILL_RADIUS,
  },
  glassBorder: {
    borderRadius: PILL_RADIUS,
    borderWidth: 0,
  },
  glassContent: {
    flexDirection: 'row',
    padding: PILL_PADDING,
    gap: 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BTN_RADIUS,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  searchButton: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BTN_RADIUS,
  },
});

function MainTabs() {
  const {useDark, themeColors} = useThemeColors();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />
      <Tab.Screen
        name="Radar"
        component={RadarScreen}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const {useDark, themeColors} = useThemeColors();
  const isDesktop = isMacOS();
  const locations = useWeatherStore(s => s.locations);
  const hasCompletedOnboarding = useWeatherStore(s => s.hasCompletedOnboarding);

  // Don't decide on onboarding until persisted state rehydrates —
  // otherwise existing users flash the onboarding on every launch.
  const [hydrated, setHydrated] = useState(useWeatherStore.persist.hasHydrated());
  useEffect(() => useWeatherStore.persist.onFinishHydration(() => setHydrated(true)), []);
  if (!hydrated) return null;

  // First-run gate: fresh installs (no saved locations) see onboarding.
  // Existing installs always have locations, so they never regress here.
  const showOnboarding = !hasCompletedOnboarding && locations.length === 0;

  console.log('[RootNavigator] isDesktop:', isDesktop, '- Using:', isDesktop ? 'MacOSHomeScreen' : 'MainTabs');

  return (
    <Stack.Navigator
      initialRouteName={showOnboarding ? 'Onboarding' : 'MainTabs'}
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.surface,
        },
        headerTintColor: themeColors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: themeColors.background,
        },
      }}>
      <Stack.Screen
        name="MainTabs"
        component={isDesktop ? MacOSHomeScreen : MainTabs}
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
