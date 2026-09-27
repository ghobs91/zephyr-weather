import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Hourly} from '../types/weather';
import {colors} from '../theme/colors';
import {getCardStyle} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {PrecipitationSummary} from './PrecipitationSummary';

interface Props {
  hourlyForecast: Hourly[];
  /** Daily probability of precipitation (0–100), used when data is stale. */
  dailyPop?: number;
  isDark: boolean;
}

/**
 * Home-screen rain outlook: a smart intensity+window summary with a
 * 12-segment waking-hour sparkbar, driven by the hourly forecast.
 */
export function PrecipitationCard({hourlyForecast, dailyPop, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="weather-pouring" size={20} color={themeColors.rain} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>
            Rain outlook
          </Text>
          <Text style={[styles.title, {color: themeColors.text}]}>
            When it rains today
          </Text>
        </View>
      </View>

      <PrecipitationSummary
        hourlyForecast={hourlyForecast}
        dailyPop={dailyPop}
        tier="header"
        isDark={isDark}
      />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, marginBottom: 16},
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
  title: {fontSize: 17, fontWeight: '600'},
});
