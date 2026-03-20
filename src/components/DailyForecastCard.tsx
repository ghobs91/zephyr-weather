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
  // Debug: log snow data for visible days
  dailyForecast.forEach((day, i) => {
    if (day.day?.precipitation?.snow !== undefined) {
      console.log(`[DailyCard] day ${i} snow=${day.day.precipitation.snow} rain=${day.day.precipitation.rain} total=${day.day.precipitation.total}`);
    }
  });
  const getDayLabel = (date: Date): string => {
    return format(date, 'EEE');
  };

  const getDateLabel = (date: Date): string => {
    return format(date, 'MM-dd');
  };

  // Get min and max temperatures for the chart
  const allTemps = dailyForecast.flatMap(day => [
    day.day?.temperature?.temperature,
    day.night?.temperature?.temperature,
  ]).filter((t): t is number => t !== undefined);
  
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const tempRange = maxTemp - minTemp || 1;

  const getBarPosition = (temp?: number): number => {
    if (temp === undefined) return 0;
    return ((temp - minTemp) / tempRange) * 100;
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.header}>
        <Icon name="calendar-month" size={20} color={themeColors.textSecondary} />
        <Text style={[styles.title, {color: themeColors.text}]}>Daily forecast</Text>
      </View>

      {/* Daily List */}
      {verticalLayout ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.daysContainerVertical}>
          {dailyForecast
            .map((day, originalIndex) => ({day, originalIndex}))
            .filter(({day}) => !isPast(startOfDay(day.date)) || isToday(day.date))
            .filter(({day}) => day.night?.temperature?.temperature !== undefined)
            .slice(0, 7)
            .map(({day, originalIndex}) => {
            const dayTemp = day.day?.temperature?.temperature;
            const nightTemp = day.night?.temperature?.temperature;
            const precipProb = day.day?.precipitationProbability?.total;

            return (
              <TouchableOpacity
                key={day.date.toISOString()}
                style={styles.dayRow}
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
                                left: `${getBarPosition(nightTemp)}%`,
                                width: `${getBarPosition(dayTemp) - getBarPosition(nightTemp)}%`,
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
          {dailyForecast
            .map((day, originalIndex) => ({day, originalIndex}))
            .filter(({day}) => !isPast(startOfDay(day.date)) || isToday(day.date))
            .filter(({day}) => day.night?.temperature?.temperature !== undefined)
            .slice(0, 7)
            .map(({day, originalIndex}) => {
            const dayTemp = day.day?.temperature?.temperature;
            const nightTemp = day.night?.temperature?.temperature;
            const precipProb = day.day?.precipitationProbability?.total;

            return (
              <TouchableOpacity
                key={day.date.toISOString()}
                style={styles.dayColumn}
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
                              bottom: `${getBarPosition(nightTemp)}%`,
                              height: `${getBarPosition(dayTemp) - getBarPosition(nightTemp)}%`,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
    gap: 8,
  },
  dayColumn: {
    alignItems: 'center',
    width: 70,
  },
  dayRow: {
    flexDirection: 'column',
    paddingVertical: 8,
  },
  dayMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayRowLeft: {
    width: 70,
    justifyContent: 'center',
  },
  dayRowRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tempBarHorizontal: {
    width: 140,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  tempBarFillHorizontal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  windContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  daySubLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  weatherIcon: {
    width: 32,
    height: 32,
  },
  tempBarContainer: {
    alignItems: 'center',
    height: 100,
    justifyContent: 'space-between',
  },
  tempLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  tempBar: {
    width: 6,
    height: 50,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  tempBarFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 3,
  },
  precipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    paddingLeft: 78,
    justifyContent: 'flex-end',
  },
  precipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  precipText: {
    fontSize: 12,
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
