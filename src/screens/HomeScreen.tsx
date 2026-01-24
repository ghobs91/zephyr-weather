import React, {useEffect, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format} from 'date-fns';

import {useWeatherStore} from '../store/weatherStore';
import {fetchWeather} from '../services/openMeteoService';
import {colors, getTemperatureColor} from '../theme/colors';
import {WeatherCode, Location} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';

import {CurrentWeatherCard} from '../components/CurrentWeatherCard';
import {DailyForecastCard} from '../components/DailyForecastCard';
import {HourlyForecastCard} from '../components/HourlyForecastCard';
import {WeatherDetailCard} from '../components/WeatherDetailCard';
import {SunMoonCard} from '../components/SunMoonCard';
import {AlertBanner} from '../components/AlertBanner';
import {AirQualityCard} from '../components/AirQualityCard';

const {width} = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  
  const {
    locations,
    currentLocationIndex,
    settings,
    isLoading,
    updateLocationWeather,
    setLoading,
    setError,
    addLocation,
  } = useWeatherStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(currentLocationIndex);
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;
  
  const currentLocation = locations[pageIndex];

  const refreshWeather = useCallback(async () => {
    if (!currentLocation) return;
    
    try {
      setLoading(true);
      const weather = await fetchWeather(
        currentLocation.latitude,
        currentLocation.longitude,
        currentLocation.timezone
      );
      updateLocationWeather(currentLocation.id, weather);
    } catch (error) {
      setError('Failed to fetch weather data');
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocation, setLoading, updateLocationWeather, setError]);

  useEffect(() => {
    // Add a default location if none exists
    if (locations.length === 0) {
      // Default to London
      addLocation({
        id: 'default',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        city: 'London',
        country: 'United Kingdom',
        countryCode: 'GB',
        isCurrentPosition: false,
        forecastSource: 'openmeteo',
      });
    }
  }, [locations.length, addLocation]);

  useEffect(() => {
    if (currentLocation && !currentLocation.weather) {
      refreshWeather();
    }
  }, [currentLocation, refreshWeather]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshWeather();
  }, [refreshWeather]);

  if (locations.length === 0) {
    return (
      <View style={[styles.emptyContainer, {backgroundColor: themeColors.background}]}>
        <Icon name="map-marker-plus" size={64} color={themeColors.textSecondary} />
        <Text style={[styles.emptyText, {color: themeColors.text}]}>
          No locations added
        </Text>
        <Text style={[styles.emptySubtext, {color: themeColors.textSecondary}]}>
          Add a location to see weather data
        </Text>
        <TouchableOpacity
          style={[styles.addButton, {backgroundColor: themeColors.primary}]}
          onPress={() => navigation.navigate('SearchLocation')}>
          <Text style={styles.addButtonText}>Add Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: themeColors.background}]}>
        <Text style={[styles.loadingText, {color: themeColors.text}]}>Loading...</Text>
      </View>
    );
  }

  const weather = currentLocation.weather;
  const current = weather?.current;
  const dailyForecast = weather?.dailyForecast ?? [];
  const hourlyForecast = weather?.hourlyForecast ?? [];
  const alerts = weather?.alerts ?? [];

  // Get today's daily data
  const today = dailyForecast[0];
  
  // Format temperature based on settings
  const formatTemp = (temp?: number) => {
    if (temp === undefined) return '--';
    if (settings.temperatureUnit === 'fahrenheit') {
      return `${Math.round(temp * 9/5 + 32)}°`;
    }
    return `${Math.round(temp)}°`;
  };

  const getWeatherIcon = (code?: WeatherCode, isDay: boolean = true): string => {
    switch (code) {
      case WeatherCode.CLEAR:
        return isDay ? 'weather-sunny' : 'weather-night';
      case WeatherCode.PARTLY_CLOUDY:
        return isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy';
      case WeatherCode.CLOUDY:
        return 'weather-cloudy';
      case WeatherCode.RAIN_LIGHT:
      case WeatherCode.RAIN:
        return 'weather-rainy';
      case WeatherCode.RAIN_HEAVY:
        return 'weather-pouring';
      case WeatherCode.SNOW_LIGHT:
      case WeatherCode.SNOW:
        return 'weather-snowy';
      case WeatherCode.SNOW_HEAVY:
        return 'weather-snowy-heavy';
      case WeatherCode.SLEET:
        return 'weather-snowy-rainy';
      case WeatherCode.HAIL:
        return 'weather-hail';
      case WeatherCode.THUNDERSTORM:
        return 'weather-lightning-rainy';
      case WeatherCode.FOG:
        return 'weather-fog';
      case WeatherCode.HAZE:
        return 'weather-hazy';
      case WeatherCode.WIND:
        return 'weather-windy';
      default:
        return isDay ? 'weather-sunny' : 'weather-night';
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingTop: insets.top},
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        
        {/* Location Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.locationHeader}
            onPress={() => navigation.navigate('SearchLocation')}>
            <Icon name="menu" size={24} color={themeColors.text} />
            <Text style={[styles.locationName, {color: themeColors.text}]}>
              {currentLocation.city || 'Unknown Location'}
            </Text>
            <Icon name="pencil" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
          
          {weather?.base?.refreshTime && (
            <Text style={[styles.updateTime, {color: themeColors.textSecondary}]}>
              <Icon name="clock-outline" size={12} color={themeColors.textSecondary} />{' '}
              {format(new Date(weather.base.refreshTime), 'HH:mm')}
            </Text>
          )}
        </View>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <AlertBanner
            alerts={alerts}
            onPress={() => navigation.navigate('Alerts')}
            isDark={useDark}
          />
        )}

        {/* Current Weather */}
        <CurrentWeatherCard
          current={current}
          today={today}
          formatTemp={formatTemp}
          getWeatherIcon={getWeatherIcon}
          isDark={useDark}
        />

        {/* Daily Forecast */}
        <DailyForecastCard
          dailyForecast={dailyForecast}
          formatTemp={formatTemp}
          getWeatherIcon={getWeatherIcon}
          isDark={useDark}
          onDayPress={(index) => navigation.navigate('DailyDetail', {dayIndex: index})}
        />

        {/* Hourly Forecast */}
        <HourlyForecastCard
          hourlyForecast={hourlyForecast}
          formatTemp={formatTemp}
          getWeatherIcon={getWeatherIcon}
          isDark={useDark}
        />

        {/* Weather Details Grid */}
        <View style={styles.detailsGrid}>
          <WeatherDetailCard
            title="Precipitation"
            value={`${current?.relativeHumidity ?? 0}%`}
            subtitle="Humidity"
            icon="water-percent"
            isDark={useDark}
          />
          <WeatherDetailCard
            title="Wind"
            value={`${Math.round(current?.wind?.speed ?? 0)} km/h`}
            subtitle={current?.wind?.gusts ? `Gusts: ${Math.round(current.wind.gusts)} km/h` : undefined}
            icon="weather-windy"
            isDark={useDark}
          />
        </View>

        <View style={styles.detailsGrid}>
          <WeatherDetailCard
            title="Pressure"
            value={`${Math.round(current?.pressure ?? 0)} hPa`}
            icon="gauge"
            isDark={useDark}
          />
          <WeatherDetailCard
            title="Visibility"
            value={current?.visibility ? `${(current.visibility / 1000).toFixed(1)} km` : '--'}
            icon="eye-outline"
            isDark={useDark}
          />
        </View>

        {/* Air Quality */}
        {current?.airQuality && (
          <AirQualityCard
            airQuality={current.airQuality}
            isDark={useDark}
          />
        )}

        {/* Sun & Moon */}
        {today && (
          <SunMoonCard
            sun={today.sun}
            moon={today.moon}
            isDark={useDark}
          />
        )}

        {/* Attribution */}
        <View style={styles.attribution}>
          <Text style={[styles.attributionText, {color: themeColors.textTertiary}]}>
            Weather data from Open-Meteo (CC BY 4.0)
          </Text>
        </View>

        <View style={{height: insets.bottom + 16}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
    marginTop: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationName: {
    fontSize: 24,
    fontWeight: '600',
    flex: 1,
  },
  updateTime: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 36,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  attribution: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  attributionText: {
    fontSize: 12,
  },
});
