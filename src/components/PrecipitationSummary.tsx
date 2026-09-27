import React, {useMemo} from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Hourly} from '../types/weather';
import {ColorTheme} from '../theme/colors';
import {getThemeColors, type} from '../theme/design';
import {
  PrecipitationSummary as PrecipitationSummaryData,
  formatPrecipitationSummary,
  hourlyPrecipitationSlots,
  selectSparklineHours,
} from '../utils/precipitationFormatter';
import {PrecipitationSparkbar, rainBarColor} from './PrecipitationSparkbar';

export type PrecipitationTier = 'minimal' | 'medium' | 'header';

const SPARKBAR_SIZES: Record<
  PrecipitationTier,
  {height: number; barWidth: number; barGap: number} | null
> = {
  minimal: null,
  medium: {height: 16, barWidth: 3, barGap: 2},
  header: {height: 24, barWidth: 5, barGap: 3},
};

export interface PrecipitationSummaryProps {
  /** Full hourly forecast; filtered internally to the actionable window. */
  hourlyForecast?: Hourly[];
  /** Daily probability of precipitation (0–100), used when data is stale. */
  dailyPop?: number;
  /** Surface size: minimal = text only, medium/header add the sparkbar. */
  tier?: PrecipitationTier;
  now?: Date;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function textColorFor(
  summary: PrecipitationSummaryData,
  theme: ColorTheme,
): string {
  if (!summary.available || !summary.hasRain) return theme.textSecondary;
  return rainBarColor(summary.intensity, theme);
}

/**
 * Smart precipitation string with an optional inline sparkbar.
 *
 * - minimal: single line of text (tight rows, lists, widgets)
 * - medium: text + 16px sparkbar (cards, inset panels)
 * - header: headline text stacked over a 24px sparkbar (screen headers)
 *
 * Missing or stale data falls back to the daily PoP text and never renders
 * a broken sparkbar.
 */
export function PrecipitationSummary({
  hourlyForecast,
  dailyPop,
  tier = 'medium',
  now,
  isDark,
  style,
  testID = 'precipitation-summary',
}: PrecipitationSummaryProps) {
  const themeColors = getThemeColors(isDark);
  const nowMs = (now ?? new Date()).getTime();

  const {summary, sparkHours} = useMemo(() => {
    const referenceDate = new Date(nowMs);
    const slots = hourlyPrecipitationSlots(hourlyForecast ?? [], referenceDate);
    const result = formatPrecipitationSummary(slots, {
      now: referenceDate,
      fallbackPop: dailyPop,
    });
    return {
      summary: result,
      sparkHours: result.available
        ? selectSparklineHours(hourlyForecast ?? [], referenceDate)
        : [],
    };
  }, [hourlyForecast, nowMs, dailyPop]);

  const color = textColorFor(summary, themeColors);
  const sparkbarSize = SPARKBAR_SIZES[tier];
  const sparkbar = sparkbarSize ? (
    <PrecipitationSparkbar
      hourlyData={sparkHours}
      isDark={isDark}
      {...sparkbarSize}
    />
  ) : null;

  if (tier === 'minimal') {
    return (
      <View testID={testID} style={style}>
        <Text style={[styles.text, type.caption, {color}]} numberOfLines={1}>
          {summary.text}
        </Text>
      </View>
    );
  }

  if (tier === 'header') {
    return (
      <View testID={testID} style={[styles.header, style]}>
        <Text style={[type.headline, {color}]} numberOfLines={1}>
          {summary.text}
        </Text>
        {sparkbar}
      </View>
    );
  }

  return (
    <View testID={testID} style={[styles.medium, style]}>
      <Text style={[styles.text, type.subhead, {color}]} numberOfLines={1}>
        {summary.text}
      </Text>
      {sparkbar}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {flexShrink: 1},
  medium: {flexDirection: 'row', alignItems: 'center', gap: 8},
  header: {alignItems: 'flex-start', gap: 6},
});
