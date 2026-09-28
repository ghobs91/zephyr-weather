import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {startOfHour} from 'date-fns';
import {LineChart} from 'react-native-wagmi-charts';

import {Hourly, Minutely} from '../types/weather';
import {TimeFormat} from '../types/settings';
import {colors} from '../theme/colors';
import {getCardStyle} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {PrecipitationSummary} from './PrecipitationSummary';
import {formatTime} from '../utils/timeFormat';

interface Props {
  hourlyForecast: Hourly[];
  minutelyForecast?: Minutely[];
  /** Daily probability of precipitation (0–100), used when data is stale. */
  dailyPop?: number;
  timeFormat: TimeFormat;
  isDark: boolean;
}

const CHART_MAX_HOURS = 48;

/**
 * Single rain card that consolidates the three previous cards:
 * - "Today": smart intensity/window summary + waking-hour sparkbar.
 * - "Next hour": 15-minute intensity bars (minutely data, when available).
 * - "Next 48 hours": hourly probability line chart.
 */
export function RainCard({
  hourlyForecast,
  minutelyForecast,
  dailyPop,
  timeFormat,
  isDark,
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  // --- Next hour (minutely) ---
  const nextHour = useMemo(() => {
    if (!minutelyForecast?.length) return null;
    const maxIntensity = Math.max(
      ...minutelyForecast.map((m) => m.precipitationIntensity ?? 0),
    );
    if (maxIntensity === 0) {
      return {
        text: 'No rain expected in the next hour',
        icon: 'weather-sunny' as const,
        color: themeColors.success,
      };
    }
    const minutesUntil =
      minutelyForecast.findIndex((m) => (m.precipitationIntensity ?? 0) > 0) *
      15;
    if (minutesUntil === 0) {
      return {
        text: 'Rain happening now',
        icon: 'weather-rainy' as const,
        color: themeColors.rain,
      };
    }
    if (minutesUntil <= 15) {
      return {
        text: 'Rain starting soon',
        icon: 'weather-rainy' as const,
        color: themeColors.warning,
      };
    }
    return {
      text: `Rain starting in ${minutesUntil} min`,
      icon: 'weather-rainy' as const,
      color: themeColors.warning,
    };
  }, [minutelyForecast, themeColors]);

  const minutelyMax = useMemo(
    () =>
      Math.max(
        ...(minutelyForecast?.map((m) => m.precipitationIntensity ?? 0) ?? []),
        0.1,
      ),
    [minutelyForecast],
  );

  // --- Next 48 hours ---
  const hours = useMemo(() => {
    const currentHourStart = startOfHour(new Date());
    return hourlyForecast
      .filter((h) => startOfHour(h.date) >= currentHourStart)
      .slice(0, CHART_MAX_HOURS);
  }, [hourlyForecast]);

  const chartValues = hours.map((h) => h.precipitationProbability?.total ?? 0);
  const chartMax = chartValues.length ? Math.max(...chartValues) : 0;
  const [chartWidth, setChartWidth] = useState(0);

  const peakIndex = chartMax > 0 ? chartValues.indexOf(chartMax) : -1;
  const peakTime =
    peakIndex >= 0
      ? formatTime(hours[peakIndex]?.date, timeFormat, {showMinutes: false})
      : '';
  const labelIdx = hours
    .map((_, i) => i)
    .filter((i) => i % 12 === 0 || i === hours.length - 1);

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="weather-pouring" size={20} color={themeColors.rain} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>
            RAIN
          </Text>
          <Text style={[styles.title, {color: themeColors.text}]}>
            Rain outlook
          </Text>
        </View>
      </View>

      {/* Today */}
      <Text style={[styles.sectionLabel, {color: themeColors.textSecondary}]}>
        Today
      </Text>
      <PrecipitationSummary
        hourlyForecast={hourlyForecast}
        dailyPop={dailyPop}
        tier="header"
        isDark={isDark}
      />

      {/* Next hour */}
      {nextHour && minutelyForecast && (
        <>
          <View
            style={[styles.divider, {backgroundColor: themeColors.separator}]}
          />
          <View style={styles.sectionHeaderRow}>
            <Icon name={nextHour.icon} size={15} color={nextHour.color} />
            <Text
              style={[
                styles.sectionLabel,
                styles.sectionLabelInline,
                {color: themeColors.textSecondary},
              ]}>
              Next hour
            </Text>
          </View>
          <Text style={[styles.nextHourText, {color: nextHour.color}]}>
            {nextHour.text}
          </Text>
          <View style={styles.minutelyChart}>
            {minutelyForecast.map((minute, index) => {
              const intensity = minute.precipitationIntensity ?? 0;
              const barHeight =
                minutelyMax > 0 ? (intensity / minutelyMax) * 100 : 0;
              const isFirst = index === 0;
              return (
                <View key={minute.date.toISOString()} style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(barHeight, 4)}%`,
                        backgroundColor: isFirst
                          ? themeColors.primary
                          : themeColors.rain,
                        opacity: isFirst ? 1 : 0.7,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.barLabel,
                      {color: themeColors.textTertiary},
                    ]}>
                    {isFirst ? 'Now' : `${minute.date.getMinutes()}m`}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Next 48 hours */}
      <View
        style={[styles.divider, {backgroundColor: themeColors.separator}]}
      />
      <Text style={[styles.sectionLabel, {color: themeColors.textSecondary}]}>
        Next 48 hours
      </Text>
      {hours.length === 0 || chartMax <= 0 ? (
        <Text style={[styles.emptyText, {color: themeColors.textSecondary}]}>
          No precipitation expected in the next 48 hours
        </Text>
      ) : (
        <>
          <Text style={[styles.peak, {color: themeColors.textSecondary}]}>
            Peak {Math.round(chartMax)}% around {peakTime}
          </Text>
          <View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
            {chartWidth > 0 && (
              <LineChart.Provider
                data={hours.map((h, index) => ({
                  timestamp: index,
                  value: h.precipitationProbability?.total ?? 0,
                }))}
                yRange={{min: 0, max: 100}}>
                <LineChart height={110} width={chartWidth}>
                  <LineChart.Path color={themeColors.rain} width={2}>
                    <LineChart.Gradient color={themeColors.rain} />
                  </LineChart.Path>
                  <LineChart.CursorCrosshair color={themeColors.rain}>
                    <LineChart.Tooltip
                      position="top"
                      textStyle={{
                        color: themeColors.text,
                        fontSize: 16,
                        fontWeight: '600',
                      }}
                      style={{
                        backgroundColor: themeColors.surface,
                        padding: 8,
                        borderRadius: 10,
                      }}>
                      <LineChart.PriceText
                        style={{
                          color: themeColors.text,
                          fontSize: 16,
                          fontWeight: '600',
                        }}
                        format={({value}) => {
                          'worklet';
                          return `${Math.round(Number(value))}%`;
                        }}
                      />
                    </LineChart.Tooltip>
                  </LineChart.CursorCrosshair>
                </LineChart>
              </LineChart.Provider>
            )}
          </View>
          <View style={styles.labelsRow}>
            {labelIdx.map((i) => (
              <Text
                key={i}
                style={[styles.chartLabel, {color: themeColors.textTertiary}]}>
                {i === 0
                  ? 'Now'
                  : formatTime(hours[i]?.date, timeFormat, {
                      showMinutes: false,
                      lowercase: true,
                    })}
              </Text>
            ))}
          </View>
        </>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, marginBottom: 16},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {fontSize: 17, fontWeight: '600'},
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionLabelInline: {marginBottom: 0},
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 14},
  nextHourText: {fontSize: 15, fontWeight: '600', marginBottom: 10},
  minutelyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 64,
    gap: 4,
    paddingHorizontal: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {width: '100%', borderRadius: 4, minHeight: 4},
  barLabel: {fontSize: 10, marginTop: 4},
  peak: {fontSize: 13, marginBottom: 8},
  emptyText: {fontSize: 14, marginTop: 2},
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  chartLabel: {fontSize: 10},
});
