import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Current, Daily, WeatherCode} from '../types/weather';
import {colors, getTemperatureColor} from '../theme/colors';

interface Props {
  current?: Current;
  today?: Daily;
  formatTemp: (temp?: number) => string;
  getWeatherIcon: (code?: WeatherCode, isDay?: boolean) => string;
  isDark: boolean;
}

export function CurrentWeatherCard({
  current,
  today,
  formatTemp,
  getWeatherIcon,
  isDark,
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;
  
  const temperature = current?.temperature?.temperature;
  const feelsLike = current?.temperature?.apparent;
  const weatherCode = current?.weatherCode;
  const weatherText = current?.weatherText;
  const dayTemp = today?.day?.temperature?.temperature;
  const nightTemp = today?.night?.temperature?.temperature;

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.mainSection}>
        <View style={styles.temperatureContainer}>
          <Text
            style={[
              styles.temperature,
              {color: temperature !== undefined
                ? getTemperatureColor(temperature, isDark)
                : themeColors.text
              },
            ]}>
            {formatTemp(temperature)}
          </Text>
        </View>
        
        <View style={styles.weatherInfo}>
          <Text style={styles.weatherIcon}>
            {getWeatherIcon(weatherCode)}
          </Text>
          <Text style={[styles.weatherText, {color: themeColors.text}]}>
            {weatherText || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        {feelsLike !== undefined && temperature !== undefined && 
         Math.abs(feelsLike - temperature) > 2 && (
          <Text style={[styles.feelsLike, {color: themeColors.textSecondary}]}>
            Feels like {formatTemp(feelsLike)}
          </Text>
        )}
        
        <View style={styles.dayNightTemps}>
          <Text style={[styles.dayNightText, {color: themeColors.textSecondary}]}>
            Day: {formatTemp(dayTemp)} • Night: {formatTemp(nightTemp)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  temperatureContainer: {
    alignItems: 'flex-start',
  },
  temperature: {
    fontSize: 72,
    fontWeight: '200',
    lineHeight: 80,
  },
  weatherInfo: {
    alignItems: 'center',
  },
  weatherIcon: {
    fontSize: 64,
  },
  weatherText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  detailsRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  feelsLike: {
    fontSize: 14,
    marginBottom: 4,
  },
  dayNightTemps: {
    flexDirection: 'row',
  },
  dayNightText: {
    fontSize: 14,
  },
});
