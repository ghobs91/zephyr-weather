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
import {fetchWeather, fetchAirQuality} from '../services/openMeteoService';
import {fetchNWSWeather, isUSLocation} from '../services/nwsService';
import {colors, getTemperatureColor} from '../theme/colors';
import {WeatherCode, Location} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';

import {CurrentWeatherCard} from '../components/CurrentWeatherCard';
import {DailyForecastCard} from '../components/DailyForecastCard';
import {HourlyForecastCard} from '../components/HourlyForecastCard';
import {WeatherDetailCard} from '../components/WeatherDetailCard';
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

  // Sync pageIndex with currentLocationIndex when it changes from outside (e.g., LocationsScreen)
  useEffect(() => {
    setPageIndex(currentLocationIndex);
  }, [currentLocationIndex]);

  const refreshWeather = useCallback(async () => {
    if (!currentLocation) return;
    
    try {
      setLoading(true);
      
      // Check if location is in the US and use NWS if available
      const useNWS = await isUSLocation(
        currentLocation.latitude,
        currentLocation.longitude
      );
      
      let weather;
      if (useNWS) {
        console.log('Using NWS API for US location');
        weather = await fetchNWSWeather(
          currentLocation.latitude,
          currentLocation.longitude
        );
        
        // Fetch air quality from Open-Meteo since NWS doesn't provide it
        const airQuality = await fetchAirQuality(
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.timezone
        );
        
        if (weather.current && airQuality) {
          weather.current.airQuality = airQuality;
        }
      } else {
        console.log('Using Open-Meteo API for international location');
        weather = await fetchWeather(
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.timezone
        );
      }
      
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
      // Default to New York
      addLocation({
        id: 'default',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        city: 'New York',
        province: 'New York',
        country: 'United States',
        countryCode: 'US',
        isCurrentPosition: false,
        forecastSource: 'nws',
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
      return `${Math.round(temp * 9/5 + 32)}°F`;
    }
    return `${Math.round(temp)}°C`;
  };

  // Format speed based on settings (input is always km/h)
  const formatSpeed = (speedKmh?: number) => {
    if (speedKmh === undefined) return '--';
    switch (settings.speedUnit) {
      case 'mph':
        return `${Math.round(speedKmh * 0.621371)} mph`;
      case 'ms':
        return `${Math.round(speedKmh * 0.277778)} m/s`;
      case 'kn':
        return `${Math.round(speedKmh * 0.539957)} kn`;
      default: // kmh
        return `${Math.round(speedKmh)} km/h`;
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
          isDaylight={current?.isDaylight}
          isDark={useDark}
        />

        {/* Daily Forecast */}
        <DailyForecastCard
          dailyForecast={dailyForecast}
          formatTemp={formatTemp}
          formatSpeed={formatSpeed}
          isDark={useDark}
          onDayPress={(index) => navigation.navigate('DailyDetail', {dayIndex: index})}
        />

        {/* Hourly Forecast */}
        <HourlyForecastCard
          hourlyForecast={hourlyForecast}
          formatTemp={formatTemp}
          formatSpeed={formatSpeed}
          isDark={useDark}
        />

        {/* Weather Details Grid */}
        <View style={styles.detailsGrid}>
          <WeatherDetailCard
            title="Precipitation"
            value={`${Math.round(today?.day?.precipitationProbability?.total ?? 0)}%`}
            subtitle="Chance of rain"
            icon="water-percent"
            isDark={useDark}
          />
          <WeatherDetailCard
            title="Wind"
            value={formatSpeed(current?.wind?.speed)}
            subtitle={current?.wind?.gusts ? `Gusts: ${formatSpeed(current.wind.gusts)}` : undefined}
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
            title="Humidity"
            value={current?.relativeHumidity !== undefined ? `${Math.round(current.relativeHumidity)}%` : '--'}
            icon="water-percent"
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

        {/* Attribution */}
        <View style={styles.attribution}>
          <Text style={[styles.attributionText, {color: themeColors.textTertiary}]}>
            {currentLocation.countryCode === 'US' 
              ? 'Weather data from NOAA National Weather Service'
              : 'Weather data from Open-Meteo (CC BY 4.0)'}
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
