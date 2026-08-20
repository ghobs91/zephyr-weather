import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format, isPast, startOfDay, isToday} from 'date-fns';
import {Daily, WeatherCode} from '../types/weather';
import {colors} from '../theme/colors';
import {getCardStyle, getInsetPanelStyle, withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {WeatherIcon} from './WeatherIcon';

// Absolute temperature scale in Celsius:
// -20°C → deep blue, 0°C → cyan, 15°C → green, 25°C → yellow, 35°C → orange, 45°C → red
const TEMP_GRADIENT_STOPS = [
  {tempC: -20, color: [26,  90,  200]},  // deep blue
  {tempC:   0, color: [70,  180, 230]},  // cyan
  {tempC:  15, color: [100, 195, 100]},  // green
  {tempC:  25, color: [248, 210,  20]},  // yellow
  {tempC:  35, color: [245, 125,  10]},  // orange
  {tempC:  45, color: [210,  40,  25]},  // red
];

function getGradientColorForTemp(tempC: number): string {
  const stops = TEMP_GRADIENT_STOPS;
  if (tempC <= stops[0].tempC) {
    const [r, g, b] = stops[0].color;
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (tempC >= stops[stops.length - 1].tempC) {
    const [r, g, b] = stops[stops.length - 1].color;
    return `rgb(${r}, ${g}, ${b})`;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    if (tempC >= stops[i].tempC && tempC <= stops[i + 1].tempC) {
      const range = stops[i + 1].tempC - stops[i].tempC;
      const t = (tempC - stops[i].tempC) / range;
      const r = Math.round(stops[i].color[0] + t * (stops[i + 1].color[0] - stops[i].color[0]));
      const g = Math.round(stops[i].color[1] + t * (stops[i + 1].color[1] - stops[i].color[1]));
      const b = Math.round(stops[i].color[2] + t * (stops[i + 1].color[2] - stops[i].color[2]));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return 'rgb(100, 195, 100)';
}

interface Props {
  dailyForecast: Daily[];
  formatTemp: (temp?: number) => string;
  formatSpeed: (speedKmh?: number) => string;
  isDark: boolean;
  onDayPress?: (index: number) => void;
  verticalLayout?: boolean;
  precipitationUnit?: 'mm' | 'inch';
}

export function DailyForecastCard({
  dailyForecast,
  formatTemp,
  formatSpeed,
  isDark,
  onDayPress,
  verticalLayout = false,
  precipitationUnit = 'inch',
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  // snowCm is Open-Meteo's snowfall_sum (cm) or NWS converted to cm
  const formatSnow = (snowCm?: number): string | null => {
    if (!snowCm || snowCm <= 0) return null;
    if (precipitationUnit === 'inch') {
      const inches = snowCm * 0.393701;
      return `${inches < 0.1 ? '<0.1' : inches.toFixed(1)}\"` ;
    }
    return `${snowCm < 1 ? snowCm.toFixed(1) : Math.round(snowCm)} cm`;
  };
  const getDayLabel = (date: Date): string => {
    return format(date, 'EEE');
  };

  const getDateLabel = (date: Date): string => {
    return format(date, 'MM-dd');
  };

  // Get min and max temperatures for the chart
  // Use reduce to avoid RangeError on very large arrays (Math.min/max spread
  // crashes with >65K args). Current data is small (~14 items), but making
  // this safe also handles edge cases from degenerate data.
  const allTemps = dailyForecast.flatMap(day => [
    day.day?.temperature?.temperature,
    day.night?.temperature?.temperature,
  ]).filter((t): t is number => t !== undefined);

  const minTemp = allTemps.reduce((a, b) => Math.min(a, b), Infinity);
  const maxTemp = allTemps.reduce((a, b) => Math.max(a, b), -Infinity);
  const tempRange = maxTemp - minTemp || 1;

  const getBarPosition = (temp?: number): number => {
    if (temp === undefined) return 0;
    return ((temp - minTemp) / tempRange) * 100;
  };

  // Returns a [start, size] pair for the temperature bar, ensuring a
  // minimum visual size even when dayTemp === nightTemp (tropical/stable
  // climates) and protecting against reversed data where night > day.
  const getBarRange = (day?: number, night?: number): [number, number] => {
    const dayPos = day !== undefined ? getBarPosition(day) : 0;
    const nightPos = night !== undefined ? getBarPosition(night) : 0;
    const lo = Math.min(dayPos, nightPos);
    const hi = Math.max(dayPos, nightPos);
    // Guarantee a minimum bar size (at least 4% of range) so it's always visible
    const size = Math.max(hi - lo, 4);
    return [lo, size];
  };

  const visibleDays = dailyForecast
    .map((day, originalIndex) => ({day, originalIndex}))
    .filter(({day}) => !isPast(startOfDay(day.date)) || isToday(day.date))
    .filter(({day}) => day.night?.temperature?.temperature !== undefined)
    .slice(0, 7);

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="calendar-month" size={20} color={themeColors.textSecondary} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Week ahead</Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Daily forecast</Text>
        </View>
      </View>

      {/* Daily List */}
      {verticalLayout ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.daysContainerVertical}>
          {visibleDays.map(({day, originalIndex}, visibleIndex) => {
            const dayTemp = day.day?.temperature?.temperature;
            const nightTemp = day.night?.temperature?.temperature;
            const precipProb = day.day?.precipitationProbability?.total;

            return (
              <TouchableOpacity
                key={day.date.toISOString()}
                style={[
                  styles.dayRow,
                  visibleIndex < visibleDays.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: withAlpha(themeColors.textTertiary, 0.22),
                  },
                ]}
                onPress={() => onDayPress?.(originalIndex)}>
                {/* Main alignment row: left labels + right content, heights match */}
                <View style={styles.dayMainRow}>
                  <View style={styles.dayRowLeft}>
                    <Text style={[styles.dayLabel, {color: themeColors.text}]} numberOfLines={1}>
                      {getDayLabel(day.date)}
                    </Text>
                    <Text style={[styles.dayLabel, {color: themeColors.textSecondary}]}>
                      {getDateLabel(day.date)}
                    </Text>
                  </View>

                  <View style={styles.dayRowRight}>
                      <View style={styles.tempRow}>
                        <WeatherIcon
                          code={day.day?.weatherCode}
                          isDay={true}
                          style={styles.weatherIcon}
                        />
                        <Text style={[styles.tempLabel, {color: themeColors.textSecondary}]}>
                          {formatTemp(nightTemp)}
                        </Text>
                        <View style={[styles.tempBarHorizontal, {backgroundColor: themeColors.surfaceVariant}]}>
                          <LinearGradient
                            colors={[
                              getGradientColorForTemp(nightTemp ?? 0),
                              getGradientColorForTemp(dayTemp ?? 0),
                            ]}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                            style={[
                              styles.tempBarFillHorizontal,
                              {
                                left: `${getBarRange(dayTemp, nightTemp)[0]}%`,
                                width: `${getBarRange(dayTemp, nightTemp)[1]}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.tempLabel, {color: themeColors.text}]}>
                          {formatTemp(dayTemp)}
                        </Text>
                      </View>
                    </View>
                  </View>

                {/* Precip row sits below the alignment row so it doesn't affect centering */}
                <View style={styles.precipRow}>
                  {precipProb !== undefined && precipProb > 0 && (
                    <View style={styles.precipContainer}>
                      <Icon name="water" size={12} color={themeColors.rain} />
                      <Text style={[styles.precipText, {color: themeColors.rain}]}>
                        {Math.round(precipProb)}%
                      </Text>
                    </View>
                  )}
                  {(() => {
                    const snowText = formatSnow(day.day?.precipitation?.snow);
                    return snowText ? (
                      <View style={styles.precipContainer}>
                        <Icon name="snowflake" size={12} color={themeColors.snow} />
                        <Text style={[styles.precipText, {color: themeColors.snow}]}>
                          {snowText}
                        </Text>
                      </View>
                    ) : null;
                  })()}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysContainer}>
          {visibleDays.map(({day, originalIndex}) => {
            const dayTemp = day.day?.temperature?.temperature;
            const nightTemp = day.night?.temperature?.temperature;
            const precipProb = day.day?.precipitationProbability?.total;

            return (
              <TouchableOpacity
                key={day.date.toISOString()}
                style={[
                  styles.dayColumn,
                  getInsetPanelStyle(themeColors),
                  {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.04 : 0.36)},
                ]}
                onPress={() => onDayPress?.(originalIndex)}>
                <Text style={[styles.dayLabel, {color: themeColors.text}]} numberOfLines={1}>
                  {getDayLabel(day.date)}
                </Text>
                <Text style={[styles.dayLabel, {color: themeColors.textSecondary}]}>
                  {getDateLabel(day.date)}
                </Text>
                
                <WeatherIcon
                  code={day.day?.weatherCode}
                  isDay={true}
                  style={styles.weatherIcon}
                />

                <View style={styles.tempBarContainer}>
                      <Text style={[styles.tempLabel, {color: themeColors.text}]}>
                        {formatTemp(dayTemp)}
                      </Text>
                      <View style={[styles.tempBar, {backgroundColor: themeColors.surfaceVariant}]}>
                        <LinearGradient
                          colors={[
                            getGradientColorForTemp(dayTemp ?? 0),
                            getGradientColorForTemp(nightTemp ?? 0),
                          ]}
                          start={{x: 0, y: 0}}
                          end={{x: 0, y: 1}}
                          style={[
                            styles.tempBarFill,
                            {
                              bottom: `${getBarRange(dayTemp, nightTemp)[0]}%`,
                              height: `${getBarRange(dayTemp, nightTemp)[1]}%`,
                            },
                          ]}
                        />
                      </View>
                      
                      <Text style={[styles.tempLabel, {color: themeColors.textSecondary}]}>
                        {formatTemp(nightTemp)}
                      </Text>
                    </View>

                    <View style={[styles.precipRow, {justifyContent: 'center'}]}>
                      {precipProb !== undefined && precipProb > 0 && (
                        <View style={styles.precipContainer}>
                          <Icon name="water" size={12} color={themeColors.rain} />
                          <Text style={[styles.precipText, {color: themeColors.rain}]}>
                            {Math.round(precipProb)}%
                          </Text>
                        </View>
                      )}
                      {(() => {
                        const snowText = formatSnow(day.day?.precipitation?.snow);
                        return snowText ? (
                          <View style={styles.precipContainer}>
                            <Icon name="snowflake" size={12} color={themeColors.snow} />
                            <Text style={[styles.precipText, {color: themeColors.snow}]}>
                              {snowText}
                            </Text>
                          </View>
                        ) : null;
                      })()}
                    </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
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
    marginBottom: 12,
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
  daysContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  daysContainerVertical: {
    paddingVertical: 8,
    gap: 0,
  },
  dayRow: {
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  dayMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayRowLeft: {
    width: 72,
  },
  dayRowRight: {
    flex: 1,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  precipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingLeft: 72,
  },
  precipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  precipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayColumn: {
    width: 112,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  weatherIcon: {
    width: 34,
    height: 34,
    marginVertical: 8,
  },
  tempBarContainer: {
    alignItems: 'center',
    width: '100%',
  },
  tempBar: {
    width: 8,
    height: 82,
    borderRadius: 999,
    marginVertical: 8,
    overflow: 'hidden',
  },
  tempBarFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 999,
  },
  tempBarHorizontal: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tempBarFillHorizontal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  tempLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 38,
    textAlign: 'center',
  },
  windContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  windText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
