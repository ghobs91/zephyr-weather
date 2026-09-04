import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Sun, Moon, MoonPhase} from '../types/weather';
import {TimeFormat} from '../types/settings';
import {colors} from '../theme/colors';
import {getCardStyle} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {formatTime} from '../utils/timeFormat';

interface Props {
  sun?: Sun;
  moon?: Moon;
  hoursOfSun?: number;
  timeFormat: TimeFormat;
  isDark: boolean;
}

function getMoonMeta(phase?: MoonPhase): {label: string; icon: string} {
  switch (phase) {
    case MoonPhase.NEW_MOON:
      return {label: 'New Moon', icon: 'moon-new'};
    case MoonPhase.WAXING_CRESCENT:
      return {label: 'Waxing Crescent', icon: 'moon-waxing-crescent'};
    case MoonPhase.FIRST_QUARTER:
      return {label: 'First Quarter', icon: 'moon-first-quarter'};
    case MoonPhase.WAXING_GIBBOUS:
      return {label: 'Waxing Gibbous', icon: 'moon-waxing-gibbous'};
    case MoonPhase.FULL_MOON:
      return {label: 'Full Moon', icon: 'moon-full'};
    case MoonPhase.WANING_GIBBOUS:
      return {label: 'Waning Gibbous', icon: 'moon-waning-gibbous'};
    case MoonPhase.THIRD_QUARTER:
      return {label: 'Last Quarter', icon: 'moon-last-quarter'};
    case MoonPhase.WANING_CRESCENT:
      return {label: 'Waning Crescent', icon: 'moon-waning-crescent'};
    default:
      return {label: '—', icon: 'moon-waning-crescent'};
  }
}

export function SunMoonCard({sun, moon, hoursOfSun, timeFormat, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  if (!sun?.riseTime && !sun?.setTime && !moon?.phase) {
    return null;
  }

  const moonMeta = getMoonMeta(moon?.phase);
  const daylight =
    hoursOfSun !== undefined
      ? `${Math.floor(hoursOfSun)}h ${Math.round((hoursOfSun % 1) * 60)}m`
      : undefined;

  const items = [
    {
      label: 'Sunrise',
      icon: 'weather-sunset-up',
      color: '#FFA500',
      value: formatTime(sun?.riseTime ? new Date(sun.riseTime) : undefined, timeFormat),
    },
    {
      label: 'Sunset',
      icon: 'weather-sunset-down',
      color: '#FF6B35',
      value: formatTime(sun?.setTime ? new Date(sun.setTime) : undefined, timeFormat),
    },
    ...(moon?.phase
      ? [
          {
            label: moonMeta.label,
            icon: moonMeta.icon,
            color: themeColors.textSecondary,
            value: daylight ?? 'Moon',
          },
        ]
      : daylight
        ? [
            {
              label: 'Daylight',
              icon: 'white-balance-sunny',
              color: themeColors.primary,
              value: daylight,
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
        <Icon name="weather-sunset" size={20} color={themeColors.textSecondary} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Astronomy</Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Sun & Moon</Text>
        </View>
      </View>

      <View style={styles.row}>
        {items.map(item => (
          <View key={item.label} style={styles.item}>
            <Icon name={item.icon} size={24} color={item.color} />
            <Text style={[styles.itemLabel, {color: themeColors.textSecondary}]}>
              {item.label}
            </Text>
            <Text style={[styles.itemValue, {color: themeColors.text}]}>{item.value}</Text>
          </View>
        ))}
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
});
