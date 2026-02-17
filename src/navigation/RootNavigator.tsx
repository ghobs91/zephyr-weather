import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useColorScheme, TouchableOpacity} from 'react-native';

import {HomeScreen} from '../screens/HomeScreen';
import {MacOSHomeScreen} from '../screens/MacOSHomeScreen';
import {LocationsScreen} from '../screens/LocationsScreen';
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
  Locations: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = useWeatherStore(state => state.settings.theme);
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  
  const themeColors = useDark ? colors.dark : colors.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeColors.surface,
          borderTopColor: themeColors.border,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Weather',
          tabBarIcon: ({color, size}) => (
            <Icon name="weather-partly-cloudy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Locations"
        component={LocationsScreen}
        options={{
          tabBarLabel: 'Locations',
          tabBarIcon: ({color, size}) => (
            <Icon name="map-marker-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({color, size}) => (
            <Icon name="cog-outline" size={size} color={color} />
          ),
        }}
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
