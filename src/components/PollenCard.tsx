import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Pollen} from '../types/weather';
import {colors} from '../theme/colors';
import {getCardStyle, getInsetPanelStyle, withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';

interface Props {
  pollen?: Pollen;
  isDark: boolean;
}

function getPollenLevel(index?: number): {label: string; colorKey: 'aqiGood' | 'aqiFair' | 'aqiModerate' | 'aqiPoor' | 'aqiVeryPoor'} {
  if (index === undefined || index === null) return {label: '—', colorKey: 'aqiGood'};
  if (index < 1) return {label: 'Low', colorKey: 'aqiGood'};
  if (index < 2) return {label: 'Low', colorKey: 'aqiGood'};
  if (index < 3) return {label: 'Moderate', colorKey: 'aqiModerate'};
  if (index < 4) return {label: 'High', colorKey: 'aqiPoor'};
  return {label: 'Very High', colorKey: 'aqiVeryPoor'};
}

export function PollenCard({pollen, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  const rows = [
    {label: 'Grass', icon: 'grass', value: pollen?.grass?.index},
    {label: 'Tree', icon: 'tree-outline', value: pollen?.tree?.index},
    {label: 'Ragweed', icon: 'leaf', value: pollen?.ragweed?.index},
  ];

  // Hide when no pollen data is available at all (e.g. NWS-only US feeds).
  if (rows.every(r => r.value === undefined || r.value === null)) {
    return null;
  }

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="flower-pollen" size={20} color={themeColors.textSecondary} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Conditions</Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Pollen</Text>
        </View>
      </View>

      <View style={styles.rows}>
        {rows.map(row => {
          const level = getPollenLevel(row.value);
          const dotColor = themeColors[level.colorKey];
          return (
            <View
              key={row.label}
              style={[
                styles.row,
                getInsetPanelStyle(themeColors),
                {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.06 : 0.54)},
              ]}>
              <Icon name={row.icon} size={18} color={themeColors.textSecondary} />
              <Text style={[styles.rowLabel, {color: themeColors.text}]}>{row.label}</Text>
              <View style={[styles.dot, {backgroundColor: dotColor}]} />
              <Text style={[styles.rowValue, {color: themeColors.textSecondary}]}>
                {row.value !== undefined && row.value !== null
                  ? `${level.label} (${Math.round(row.value)})`
                  : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.footer, {color: themeColors.textTertiary}]}>
        CAMS pollen index via Open-Meteo
      </Text>
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
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowValue: {
    fontSize: 13,
    minWidth: 90,
    textAlign: 'right',
  },
  footer: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'right',
  },
});
