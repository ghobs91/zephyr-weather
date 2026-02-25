import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useColorScheme, TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {HomeScreen} from '../screens/HomeScreen';
import {MacOSHomeScreen} from '../screens/MacOSHomeScreen';
import {RadarScreen} from '../screens/RadarScreen';
import {SearchLocationScreen} from '../screens/SearchLocationScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {DailyDetailScreen} from '../screens/DailyDetailScreen';
import {AlertsScreen} from '../screens/AlertsScreen';
import {useWeatherStore} from '../store/weatherStore';
import {colors} from '../theme/colors';
import {isMacOS} from '../utils/platformDetect';

export type RootStackParamList = {
  MainTabs: undefined;
  DailyDetail: {dayIndex: number};
  SearchLocation: undefined;
  Alerts: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Radar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_CONFIG: Record<string, {icon: string; label: string}> = {
  Home: {icon: 'weather-partly-cloudy', label: 'Weather'},
  Radar: {icon: 'radar', label: 'Radar'},
};

function GlassPill({children, style, useDark}: {children: React.ReactNode; style?: any; useDark: boolean}) {
  return (
    <View style={[tabBarStyles.glassPill, useDark ? tabBarStyles.glassPillDark : tabBarStyles.glassPillLight, style]}>
      {/* Bottom layer: tinted fill */}
      <View style={[StyleSheet.absoluteFill, {borderRadius: 26, backgroundColor: useDark ? 'rgba(28,38,54,0.72)' : 'rgba(245,247,250,0.72)'}]} />
      {/* Top highlight shimmer */}
      <View style={[tabBarStyles.glassShimmer, {backgroundColor: useDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)'}]} />
      {/* Inner border highlight */}
      <View style={[StyleSheet.absoluteFill, tabBarStyles.glassBorder, {borderColor: useDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)'}]} />
      <View style={tabBarStyles.glassContent}>{children}</View>
    </View>
  );
}

function CustomTabBar({state, navigation}: any) {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useWeatherStore((s: any) => s.settings.theme);
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[tabBarStyles.container, {paddingBottom: (insets.bottom || 12) + 4}]}
      pointerEvents="box-none">
      {/* Left pill: Weather + Radar */}
      <GlassPill useDark={useDark}>
        {state.routes.map((route: any, index: number) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;
          const isFocused = state.index === index;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={[
                tabBarStyles.tabButton,
                isFocused && {backgroundColor: themeColors.primary + 'DD'},
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
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </GlassPill>

      {/* Right pill: Search */}
      <GlassPill useDark={useDark}>
        <TouchableOpacity
          onPress={() => navigation.navigate('SearchLocation')}
          style={tabBarStyles.searchButton}>
          <Icon name="magnify" size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </GlassPill>
    </View>
  );
}

// Outer pill radius = 26, content padding = 5, so inner button radius = 26 - 5 = 21
const PILL_RADIUS = 26;
const PILL_PADDING = 5;
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
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 16,
  },
  glassPillDark: {
    shadowColor: '#000',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassPillLight: {
    shadowColor: '#6b7280',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.7)',
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
    borderWidth: 1,
  },
  glassContent: {
    flexDirection: 'row',
    padding: PILL_PADDING,
    gap: 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
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
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useWeatherStore(state => state.settings.theme);
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  
  const themeColors = useDark ? colors.dark : colors.light;

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
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useWeatherStore(state => state.settings.theme);
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  
  const themeColors = useDark ? colors.dark : colors.light;
  const isDesktop = isMacOS();

  console.log('[RootNavigator] isDesktop:', isDesktop, '- Using:', isDesktop ? 'MacOSHomeScreen' : 'MainTabs');

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.surface,
        },
        headerTintColor: themeColors.text,
        contentStyle: {
          backgroundColor: themeColors.background,
        },
      }}>
      <Stack.Screen
        name="MainTabs"
        component={isDesktop ? MacOSHomeScreen : MainTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DailyDetail"
        component={DailyDetailScreen}
        options={{
          title: 'Daily Forecast',
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
    </Stack.Navigator>
  );
}
