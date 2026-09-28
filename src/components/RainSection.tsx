import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {startOfHour} from 'date-fns';
import {LineChart} from 'react-native-wagmi-charts';

import {Hourly, Minutely} from '../types/weather';
import {TimeFormat} from '../types/settings';
import {colors} from '../theme/colors';
import {getInsetPanelStyle} from '../theme/design';
import {PrecipitationSummary} from './PrecipitationSummary';
import {PrecipitationSparkbar} from './PrecipitationSparkbar';
import {selectSparklineHours} from '../utils/precipitationFormatter';
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
const CHART_HEIGHT = 64;

/**
 * Compact precipitation block that lives at the bottom of the current
 * conditions card: a "Today" and "Next hour" gauge side by side, over a short
 * 48-hour probability chart with a labelled y-axis.
 */
export function RainSection({
  hourlyForecast,
  minutelyForecast,
  dailyPop,
  timeFormat,
  isDark,
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;
  const now = new Date();

  // --- Next hour (minutely) ---
  const nextHour = useMemo(() => {
    if (!minutelyForecast?.length) return null;
    const maxIntensity = Math.max(
      ...minutelyForecast.map((m) => m.precipitationIntensity ?? 0),
    );
    if (maxIntensity === 0) {
      return {
        text: 'No rain expected',
        icon: 'weather-sunny' as const,
        color: themeColors.success,
      };
    }
    const minutesUntil =
      minutelyForecast.findIndex((m) => (m.precipitationIntensity ?? 0) > 0) *
      15;
    if (minutesUntil === 0) {
      return {
        text: 'Rain now',
        icon: 'weather-rainy' as const,
        color: themeColors.rain,
      };
    }
    if (minutesUntil <= 15) {
      return {
        text: 'Starting soon',
        icon: 'weather-rainy' as const,
        color: themeColors.warning,
      };
    }
    return {
      text: `Starts in ${minutesUntil}m`,
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

  const sparkHours = useMemo(
    () => selectSparklineHours(hourlyForecast, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hourlyForecast],
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

  const hasMinutely = Boolean(nextHour && minutelyForecast?.length);

  return (
    <View style={styles.section}>
      <View
        style={[styles.divider, {backgroundColor: themeColors.separator}]}
      />

      {/* Side-by-side gauges */}
      <View style={styles.gaugesRow}>
        <View style={[styles.gauge, getInsetPanelStyle(themeColors)]}>
          <Text style={[styles.gaugeLabel, {color: themeColors.textTertiary}]}>
            TODAY
          </Text>
          <PrecipitationSummary
            hourlyForecast={hourlyForecast}
            dailyPop={dailyPop}
            tier="minimal"
            isDark={isDark}
          />
          <PrecipitationSparkbar
            hourlyData={sparkHours}
            height={14}
            barWidth={3}
            barGap={2}
            isDark={isDark}
          />
        </View>

        <View style={[styles.gauge, getInsetPanelStyle(themeColors)]}>
          <Text style={[styles.gaugeLabel, {color: themeColors.textTertiary}]}>
            NEXT HOUR
          </Text>
          {hasMinutely && nextHour ? (
            <>
              <View style={styles.nextHourRow}>
                <Icon name={nextHour.icon} size={14} color={nextHour.color} />
                <Text
                  style={[styles.nextHourText, {color: nextHour.color}]}
                  numberOfLines={1}>
                  {nextHour.text}
                </Text>
              </View>
              <View style={styles.minutelyChart}>
                {minutelyForecast!.map((minute, index) => {
                  const intensity = minute.precipitationIntensity ?? 0;
                  const barHeight =
                    minutelyMax > 0 ? (intensity / minutelyMax) * 100 : 0;
                  return (
                    <View
                      key={minute.date.toISOString()}
                      style={styles.barColumn}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(barHeight, 6)}%`,
                            backgroundColor: themeColors.rain,
                            opacity: index === 0 ? 1 : 0.7,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <Text
              style={[styles.nextHourText, {color: themeColors.textSecondary}]}>
              —
            </Text>
          )}
        </View>
      </View>

      {/* Next 48 hours, short, with a y-axis */}
      <Text style={[styles.sectionLabel, {color: themeColors.textSecondary}]}>
        NEXT 48 HOURS
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
          <View style={styles.chartRow}>
            <View style={styles.yAxis}>
              <Text style={[styles.yLabel, {color: themeColors.textTertiary}]}>
                100%
              </Text>
              <Text style={[styles.yLabel, {color: themeColors.textTertiary}]}>
                50%
              </Text>
              <Text style={[styles.yLabel, {color: themeColors.textTertiary}]}>
                0%
              </Text>
            </View>
            <View
              style={styles.chartArea}
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
              {chartWidth > 0 && (
                <LineChart.Provider
                  data={hours.map((h, index) => ({
                    timestamp: index,
                    value: h.precipitationProbability?.total ?? 0,
                  }))}
                  yRange={{min: 0, max: 100}}>
                  <LineChart height={CHART_HEIGHT} width={chartWidth}>
                    <LineChart.Path color={themeColors.rain} width={2}>
                      <LineChart.Gradient color={themeColors.rain} />
                    </LineChart.Path>
                  </LineChart>
                </LineChart.Provider>
              )}
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: {marginTop: 16},
  divider: {height: StyleSheet.hairlineWidth, marginBottom: 16},
  gaugesRow: {flexDirection: 'row', gap: 10},
  gauge: {flex: 1, padding: 12, gap: 8},
  gaugeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  nextHourRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  nextHourText: {fontSize: 13, fontWeight: '600'},
  minutelyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
    gap: 2,
    marginTop: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {width: '100%', borderRadius: 2, minHeight: 2},
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 6,
  },
  peak: {fontSize: 12, marginBottom: 6},
  emptyText: {fontSize: 13},
  chartRow: {flexDirection: 'row', alignItems: 'stretch'},
  yAxis: {
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yLabel: {fontSize: 9, lineHeight: 10},
  chartArea: {flex: 1, height: CHART_HEIGHT},
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingLeft: 34,
    paddingRight: 4,
  },
  chartLabel: {fontSize: 10},
});
