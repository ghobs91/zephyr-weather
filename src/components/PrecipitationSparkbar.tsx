import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {Hourly} from '../types/weather';
import {ColorTheme, colors} from '../theme/colors';
import {withAlpha} from '../theme/design';
import {
  RainIntensity,
  classifyRainIntensity,
  hourlyRainRateInchesPerHr,
  sparklineBarHeight,
} from '../utils/precipitationFormatter';

export interface PrecipitationSparkbarProps {
  /** Up to 12 waking-hour forecasts (08:00–20:00). */
  hourlyData: Hourly[];
  /** Component height in px. Default 16. */
  height?: number;
  /** Bar width in px. Default 3. */
  barWidth?: number;
  /** Gap between bars in px. Default 2. */
  barGap?: number;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Bar colour by intensity: gray rail, brand blue, then amber/red warnings. */
export function rainBarColor(
  intensity: RainIntensity,
  theme: ColorTheme,
): string {
  switch (intensity) {
    case 'drizzle':
    case 'moderate':
      return theme.rain;
    case 'heavy':
      return theme.warning;
    case 'torrential':
      return theme.error;
    default:
      return withAlpha(theme.cloudy, 0.15);
  }
}

function hoursKey(hour: Hourly, index: number): string {
  return hour.date instanceof Date && Number.isFinite(hour.date.getTime())
    ? hour.date.toISOString()
    : `hour-${index}`;
}

/**
 * Compact, non-interactive 12-segment rain-intensity timeline. Bar heights
 * follow a log scale (see `sparklineBarHeight`); colours escalate from a
 * translucent gray rail through brand blue to amber/red.
 */
export function PrecipitationSparkbar({
  hourlyData,
  height = 16,
  barWidth = 3,
  barGap = 2,
  isDark,
  style,
  testID = 'precipitation-sparkbar',
}: PrecipitationSparkbarProps) {
  if (!hourlyData?.length) return null;
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View
      testID={testID}
      accessible={false}
      style={[styles.container, {height, gap: barGap}, style]}>
      {hourlyData.map((hour, index) => {
        const rate = hourlyRainRateInchesPerHr(hour);
        const intensity = classifyRainIntensity(rate);
        return (
          <View
            key={hoursKey(hour, index)}
            testID={`${testID}-bar`}
            style={{
              width: barWidth,
              height: sparklineBarHeight(rate, height),
              borderRadius: barWidth / 2,
              backgroundColor: rainBarColor(intensity, themeColors),
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flexDirection: 'row', alignItems: 'flex-end'},
});
