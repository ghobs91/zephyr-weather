import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from './ScaledText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {SpaceWeather} from '../types/weather';
import {colors} from '../theme/colors';
import {getCardStyle} from '../theme/design';
import {GlassSurface} from './GlassSurface';

interface Props {
  spaceWeather?: SpaceWeather;
  isDark: boolean;
}

/**
 * NOAA SWPC geomagnetic activity and aurora-visibility estimate. Hidden when
 * SWPC data is unavailable. Kp is the planetary K index (0–9).
 */
export function AuroraCard({spaceWeather, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  if (
    !spaceWeather ||
    (spaceWeather.kpIndex === undefined &&
      spaceWeather.auroraLatitude === undefined)
  ) {
    return null;
  }

  const kp = spaceWeather.kpIndex ?? 0;
  const level = getKpLevel(kp);
  const accent = level.color;

  const now = Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;
  const nextDay = (spaceWeather.kpForecast ?? []).filter(
    (p) => p.date.getTime() >= now && p.date.getTime() <= horizon,
  );
  const maxKp = nextDay.length
    ? Math.max(...nextDay.map((p) => p.kp))
    : undefined;

  const items = [
    {
      label: 'Kp index',
      icon: 'chart-line',
      color: accent,
      value: kp.toFixed(1),
    },
    ...(spaceWeather.auroraLatitude !== undefined
      ? [
          {
            label: 'Visible to',
            icon: 'compass-outline',
            color: accent,
            value: `${Math.round(spaceWeather.auroraLatitude)}°`,
          },
        ]
      : []),
    ...(spaceWeather.solarWindSpeed !== undefined
      ? [
          {
            label: 'Solar wind',
            icon: 'weather-windy',
            color: themeColors.textSecondary,
            value: `${Math.round(spaceWeather.solarWindSpeed)} km/s`,
          },
        ]
      : []),
    ...(maxKp !== undefined
      ? [
          {
            label: 'Next 24h',
            icon: 'clock-outline',
            color: themeColors.textSecondary,
            value: maxKp.toFixed(1),
          },
        ]
      : []),
  ];

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon
          name="weather-night"
          size={20}
          color={themeColors.textSecondary}
        />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>
            Space Weather
          </Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Aurora</Text>
        </View>
        <View style={[styles.badge, {backgroundColor: accent}]}>
          <Text style={styles.badgeText}>{level.label}</Text>
        </View>
      </View>

      <View style={styles.row}>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <Icon name={item.icon} size={24} color={item.color} />
            <Text
              style={[styles.itemLabel, {color: themeColors.textSecondary}]}>
              {item.label}
            </Text>
            <Text style={[styles.itemValue, {color: themeColors.text}]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footer, {color: themeColors.textTertiary}]}>
        NOAA Space Weather Prediction Center
      </Text>
    </GlassSurface>
  );
}

function getKpLevel(kp: number): {label: string; color: string} {
  if (kp >= 7) return {label: 'Severe storm', color: '#EF4444'};
  if (kp >= 5) return {label: 'Geomagnetic storm', color: '#A855F7'};
  if (kp >= 4) return {label: 'Active', color: '#4ADE80'};
  return {label: 'Quiet', color: '#64748B'};
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
  badge: {
    marginLeft: 'auto',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  footer: {
    fontSize: 11,
    marginTop: 12,
    textAlign: 'right',
  },
});
