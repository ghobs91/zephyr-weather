import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {isSameHour} from 'date-fns';
import {Hourly, WeatherCode} from '../types/weather';
import {colors} from '../theme/colors';
import {WeatherIcon} from './WeatherIcon';
import {TimeFormat} from '../types/settings';
import {formatHourlyTime} from '../utils/timeFormat';

interface Props {
  hourlyForecast: Hourly[];
  formatTemp: (temp?: number) => string;
  formatSpeed: (speedKmh?: number) => string;
  timeFormat: TimeFormat;
  isDark: boolean;
}

export function HourlyForecastCard({
  hourlyForecast,
  formatTemp,
  formatSpeed,
  timeFormat,
  isDark,
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  const now = new Date();
  
  // Filter to show from current hour onwards, limit to 24 hours
  const filteredHours = hourlyForecast
    .filter(hour => hour.date >= now)
    .slice(0, 24);

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.header}>
        <Icon name="clock-outline" size={20} color={themeColors.textSecondary} />
        <Text style={[styles.title, {color: themeColors.text}]}>Hourly forecast</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hoursContainer}>
        {filteredHours.map((hour, index) => {
          const temp = hour.temperature?.temperature;
          const isNow = isSameHour(hour.date, now);
          const precipProb = hour.precipitationProbability?.total;

          return (
            <View key={hour.date.toISOString()} style={styles.hourColumn}>
              <Text
                style={[
                  styles.hourLabel,
                  {color: isNow ? themeColors.primary : themeColors.text},
                ]}>
                {formatHourlyTime(hour.date, isNow, timeFormat)}
              </Text>

              <WeatherIcon
                code={hour.weatherCode}
                isDay={hour.isDaylight}
                style={styles.weatherIcon}
              />

              <Text style={[styles.tempText, {color: themeColors.text}]}>
                {formatTemp(temp)}
              </Text>

              {precipProb !== undefined && precipProb > 0 && (
                <View style={styles.precipContainer}>
                  <Icon name="water" size={10} color={themeColors.rain} />
                  <Text style={[styles.precipText, {color: themeColors.rain}]}>
                    {Math.round(precipProb)}%
                  </Text>
                </View>
              )}

              <Text style={[styles.windText, {color: themeColors.textSecondary}]}>
                {formatSpeed(hour.wind?.speed)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Normal range indicator */}
      <View style={styles.normalRange}>
        <View style={[styles.normalLine, {backgroundColor: themeColors.border}]} />
        <Text style={[styles.normalText, {color: themeColors.textTertiary}]}>Normal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  hoursContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  hourColumn: {
    alignItems: 'center',
    width: 66,
  },
  hourLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  weatherIcon: {
    width: 28,
    height: 28,
    marginVertical: 4,
  },
  tempText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  precipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  precipText: {
    fontSize: 11,
  },
  windInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  windText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  normalRange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  normalLine: {
    flex: 1,
    height: 1,
  },
  normalText: {
    fontSize: 10,
  },
});
