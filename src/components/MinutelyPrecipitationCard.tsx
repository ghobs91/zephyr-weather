import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Minutely} from '../types/weather';
import {colors} from '../theme/colors';
import {getCardStyle, getInsetPanelStyle, withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';

interface Props {
  minutelyForecast: Minutely[];
  isDark: boolean;
}

/**
 * Shows next-hour precipitation intensity as a bar chart.
 * Each bar represents a 15-minute window.
 */
export function MinutelyPrecipitationCard({minutelyForecast, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  const summary = useMemo(() => {
    if (!minutelyForecast.length) return null;
    const maxIntensity = Math.max(
      ...minutelyForecast.map(m => m.precipitationIntensity ?? 0),
    );
    if (maxIntensity === 0) return {text: 'No rain expected in the next hour', icon: 'weather-sunny' as const, color: themeColors.success};
    const minutesUntil = minutelyForecast.findIndex(m => (m.precipitationIntensity ?? 0) > 0) * 15;
    if (minutesUntil === 0) return {text: 'Rain happening now', icon: 'weather-rainy' as const, color: themeColors.rain};
    if (minutesUntil <= 15) return {text: 'Rain starting soon', icon: 'weather-rainy' as const, color: themeColors.warning};
    return {text: `Rain starting in ${minutesUntil} min`, icon: 'weather-rainy' as const, color: themeColors.warning};
  }, [minutelyForecast, themeColors]);

  if (!minutelyForecast.length || !summary) return null;

  const maxIntensity = Math.max(...minutelyForecast.map(m => m.precipitationIntensity ?? 0), 0.1);
  const now = new Date();

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name={summary.icon} size={20} color={summary.color} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>
            Next-Hour Rain
          </Text>
          <Text style={[styles.title, {color: summary.color}]}>{summary.text}</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {minutelyForecast.map((minute, index) => {
          const intensity = minute.precipitationIntensity ?? 0;
          const barHeight = maxIntensity > 0 ? (intensity / maxIntensity) * 100 : 0;
          const isFirst = index === 0;

          return (
            <View key={minute.date.toISOString()} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(barHeight, 4)}%`,
                    backgroundColor: isFirst ? themeColors.primary : themeColors.rain,
                    opacity: isFirst ? 1 : 0.7,
                  },
                  getInsetPanelStyle(themeColors),
                ]}
              />
              <Text style={[styles.label, {color: themeColors.textTertiary}]}>
                {index === 0
                  ? 'Now'
                  : `${minute.date.getMinutes()}m`}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, marginBottom: 16},
  header: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16},
  eyebrow: {fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase'},
  title: {fontSize: 17, fontWeight: '600'},
  chart: {flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4, paddingHorizontal: 4},
  barColumn: {flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%'},
  bar: {width: '100%', borderRadius: 4, minHeight: 4},
  label: {fontSize: 10, marginTop: 4},
});
