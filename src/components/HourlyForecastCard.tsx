import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {isSameHour, startOfHour} from 'date-fns';
import {Hourly, WeatherCode} from '../types/weather';
import {colors} from '../theme/colors';
import {getCardStyle, getInsetPanelStyle, withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';
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

  // Include the current hour even if `now` is past the top of the hour,
  // so the "Now" marker always appears. We compare against the start of
  // the current hour instead of the raw timestamp.
  const currentHourStart = startOfHour(now);

  // Filter to show from current hour onwards, limit to 24 hours
  const filteredHours = hourlyForecast
    .filter(hour => startOfHour(hour.date) >= currentHourStart)
    .slice(0, 24);

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="clock-outline" size={20} color={themeColors.textSecondary} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Timeline</Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Hourly forecast</Text>
        </View>
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
            <View
              key={hour.date.toISOString()}
              style={[
                styles.hourColumn,
                getInsetPanelStyle(themeColors),
                {
                  backgroundColor: isNow
                    ? withAlpha(themeColors.primary, isDark ? 0.16 : 0.12)
                    : withAlpha(themeColors.surfaceElevated, isDark ? 0.04 : 0.36),
                  borderColor: isNow
                    ? withAlpha(themeColors.primary, 0.35)
                    : 'transparent',
                },
              ]}>
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

      <View style={styles.footer}>
        <Text style={[styles.footerText, {color: themeColors.textTertiary}]}>Next 24 hours</Text>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
    width: 78,
    paddingVertical: 14,
    paddingHorizontal: 8,
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
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
  },
});
