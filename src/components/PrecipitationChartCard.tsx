import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {startOfHour} from 'date-fns';
import {LineChart} from 'react-native-wagmi-charts';
import {Hourly} from '../types/weather';
import {TimeFormat} from '../types/settings';
import {colors} from '../theme/colors';
import {getCardStyle} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {formatTime} from '../utils/timeFormat';

interface Props {
  hourlyForecast: Hourly[];
  timeFormat: TimeFormat;
  isDark: boolean;
}

export function PrecipitationChartCard({hourlyForecast, timeFormat, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;
  const [width, setWidth] = useState(0);

  const currentHourStart = startOfHour(new Date());
  const hours = hourlyForecast
    .filter(h => startOfHour(h.date) >= currentHourStart)
    .slice(0, 48);

  const values = hours.map(h => h.precipitationProbability?.total ?? 0);
  const max = values.length ? Math.max(...values) : 0;

  // Nothing to plot — keep the card informative instead of flat-lined.
  if (hours.length === 0 || max <= 0) {
    return (
      <GlassSurface
        isDark={isDark}
        themeColors={themeColors}
        style={[styles.container, getCardStyle(themeColors)]}>
        <View style={styles.header}>
          <Icon name="water-outline" size={20} color={themeColors.textSecondary} />
          <View>
            <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Precipitation</Text>
            <Text style={[styles.title, {color: themeColors.text}]}>Chance of rain · 48h</Text>
          </View>
        </View>
        <Text style={[styles.emptyText, {color: themeColors.textSecondary}]}>
          No precipitation expected in the next 48 hours
        </Text>
      </GlassSurface>
    );
  }

  const peakIndex = values.indexOf(max);
  const peakTime = formatTime(hours[peakIndex]?.date, timeFormat, {showMinutes: false});
  const labelIdx = hours.map((_, i) => i).filter(i => i % 12 === 0 || i === hours.length - 1);

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="water" size={20} color={themeColors.textSecondary} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Precipitation</Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Chance of rain · 48h</Text>
        </View>
      </View>

      <Text style={[styles.peak, {color: themeColors.textSecondary}]}>
        Peak {Math.round(max)}% around {peakTime}
      </Text>

      <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <LineChart.Provider
            data={hours.map((h, index) => ({
              timestamp: index,
              value: h.precipitationProbability?.total ?? 0,
            }))}
            yRange={{min: 0, max: 100}}>
            <LineChart height={110} width={width}>
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
                    backgroundColor: themeColors.cardBackground,
                    padding: 8,
                    borderRadius: 8,
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
        {labelIdx.map(i => (
          <Text key={i} style={[styles.label, {color: themeColors.textTertiary}]}>
            {i === 0
              ? 'Now'
              : formatTime(hours[i]?.date, timeFormat, {showMinutes: false, lowercase: true})}
          </Text>
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
    marginBottom: 4,
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
  peak: {
    fontSize: 13,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 10,
  },
});
