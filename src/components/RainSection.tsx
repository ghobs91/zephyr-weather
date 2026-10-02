import React, {useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from './ScaledText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {startOfHour} from 'date-fns';
import {LineChart} from 'react-native-wagmi-charts';

import {Hourly, Minutely} from '../types/weather';
import {TimeFormat} from '../types/settings';
import {ColorTheme, colors} from '../theme/colors';
import {getInsetPanelStyle} from '../theme/design';
import {
  RAIN_START_HORIZON_MINUTES,
  estimateRainStart,
  formatRainStart,
  rainDisruptionProbability,
} from '../utils/precipitationFormatter';
import {formatTime} from '../utils/timeFormat';

interface Props {
  hourlyForecast: Hourly[];
  minutelyForecast?: Minutely[];
  timeFormat: TimeFormat;
  isDark: boolean;
}

const CHART_MAX_HOURS = 48;
const CHART_HEIGHT = 88;
// wagmi's LineChart reserves the bottom 40pt of `height` for x-axis labels,
// so the actual plot area is `height - 40`.
const CHART_PLOT_HEIGHT = CHART_HEIGHT - 40;

/** Colour for the disruption percentage, escalating with severity. */
function disruptionColorFor(
  probability: number | null,
  themeColors: ColorTheme,
): string {
  if (probability === null || probability <= 0) return themeColors.textSecondary;
  if (probability >= 60) return themeColors.error;
  if (probability >= 30) return themeColors.warning;
  return themeColors.rain;
}

/**
 * Compact, rain-scoped block that lives at the bottom of the current
 * conditions card: a "rain disruption" gauge next to a "next hour" rain-start
 * gauge, over a short 48-hour probability chart with a labelled y-axis.
 */
export function RainSection({
  hourlyForecast,
  minutelyForecast,
  timeFormat,
  isDark,
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;
  const now = new Date();

  const hasMinutely = Boolean(minutelyForecast?.length);

  // --- Next hour (minutely) ---
  const rainStart = useMemo(
    () => (hasMinutely ? estimateRainStart(minutelyForecast, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minutelyForecast, hasMinutely],
  );

  const nextHourText = formatRainStart(rainStart);
  const nextHourColor =
    rainStart === null
      ? themeColors.success
      : rainStart <= 0
      ? themeColors.rain
      : themeColors.warning;
  const nextHourIcon = rainStart === null ? 'weather-sunny' : 'weather-rainy';

  // Only the next 60 minutes belong to the "next hour" gauge.
  const nextHourMinutes = useMemo(() => {
    if (!minutelyForecast?.length) return [];
    const nowMs = now.getTime();
    const horizonMs = nowMs + RAIN_START_HORIZON_MINUTES * 60000;
    return minutelyForecast.filter((minute) => {
      const start = minute.date?.getTime?.();
      if (!Number.isFinite(start)) return false;
      const intervalMs =
        (minute.minuteInterval > 0 ? minute.minuteInterval : 15) * 60000;
      return start + intervalMs > nowMs && start < horizonMs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutelyForecast]);

  const minutelyMax = Math.max(
    ...nextHourMinutes.map((minute) => minute.precipitationIntensity ?? 0),
    0.1,
  );

  // --- Rain disruption across the waking day ---
  const disruption = useMemo(
    () => rainDisruptionProbability(hourlyForecast, now),
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

  return (
    <View style={styles.section}>
      <View
        style={[styles.divider, {backgroundColor: themeColors.separator}]}
      />

      {/* Section header: everything below is rain for the day */}
      <View style={styles.sectionHeader}>
        <Icon name="weather-rainy" size={13} color={themeColors.rain} />
        <Text
          style={[styles.sectionHeaderText, {color: themeColors.textSecondary}]}>
          RAIN
        </Text>
      </View>

      {/* Side-by-side gauges */}
      <View style={styles.gaugesRow}>
        <View style={[styles.gauge, getInsetPanelStyle(themeColors)]}>
          <Text style={[styles.gaugeLabel, {color: themeColors.textTertiary}]}>
            RAIN DISRUPTION
          </Text>
          <Text
            style={[
              styles.disruptionValue,
              {color: disruptionColorFor(disruption, themeColors)},
            ]}>
            {disruption === null ? '--' : `${disruption}%`}
          </Text>
          <Text
            style={[styles.disruptionCaption, {color: themeColors.textSecondary}]}
            numberOfLines={2}>
            Chance rain affects your day
          </Text>
        </View>

        <View style={[styles.gauge, getInsetPanelStyle(themeColors)]}>
          <Text style={[styles.gaugeLabel, {color: themeColors.textTertiary}]}>
            NEXT HOUR
          </Text>
          {hasMinutely ? (
            <>
              <View style={styles.nextHourRow}>
                <Icon name={nextHourIcon} size={14} color={nextHourColor} />
                <Text
                  style={[styles.nextHourText, {color: nextHourColor}]}
                  numberOfLines={1}>
                  {nextHourText}
                </Text>
              </View>
              {nextHourMinutes.length > 0 && (
                <View style={styles.minutelyChart}>
                  {nextHourMinutes.map((minute, index) => {
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
              )}
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
                  <LineChart
                    height={CHART_HEIGHT}
                    width={chartWidth}
                    yGutter={0}>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  gaugesRow: {flexDirection: 'row', gap: 10},
  gauge: {flex: 1, padding: 12, gap: 6},
  gaugeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  disruptionValue: {fontSize: 28, fontWeight: '700', lineHeight: 32},
  disruptionCaption: {fontSize: 11, lineHeight: 14},
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
  chartRow: {flexDirection: 'row', alignItems: 'flex-start'},
  yAxis: {
    height: CHART_PLOT_HEIGHT,
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
