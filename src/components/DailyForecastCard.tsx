import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format, isPast, startOfDay, isToday} from 'date-fns';
import {Daily, WeatherCode} from '../types/weather';
import {colors} from '../theme/colors';
import {getWeatherIconSource} from '../utils/weatherIcons';

interface Props {
  dailyForecast: Daily[];
  formatTemp: (temp?: number) => string;
  formatSpeed: (speedKmh?: number) => string;
  isDark: boolean;
  onDayPress?: (index: number) => void;
  verticalLayout?: boolean;
  precipitationUnit?: 'mm' | 'inch';
}

type TabType = 'conditions' | 'wind';

export function DailyForecastCard({
  dailyForecast,
  formatTemp,
  formatSpeed,
  isDark,
  onDayPress,
  verticalLayout = false,
  precipitationUnit = 'inch',
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('conditions');
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

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'conditions' && {
              backgroundColor: themeColors.primary,
            },
          ]}
          onPress={() => setActiveTab('conditions')}>
          <Text
            style={[
              styles.tabText,
              {color: activeTab === 'conditions' ? '#FFFFFF' : themeColors.textSecondary},
            ]}>
            Conditions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'wind' && {
              backgroundColor: themeColors.primary,
            },
          ]}
          onPress={() => setActiveTab('wind')}>
          <Text
            style={[
              styles.tabText,
              {color: activeTab === 'wind' ? '#FFFFFF' : themeColors.textSecondary},
            ]}>
            Wind
          </Text>
        </TouchableOpacity>
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
                <View style={styles.dayRowLeft}>
                  <Text style={[styles.dayLabel, {color: themeColors.text}]} numberOfLines={1}>
                    {getDayLabel(day.date)}
                  </Text>
                  <Text style={[styles.dateLabel, {color: themeColors.textSecondary}]}>
                    {getDateLabel(day.date)}
                  </Text>
                </View>
                
                <Image
                  source={getWeatherIconSource(day.day?.weatherCode, true)}
                  style={styles.weatherIcon}
                  resizeMode="contain"
                />

                {activeTab === 'conditions' ? (
                  <View style={styles.dayRowRight}>
                    <View style={styles.tempRow}>
                      <Text style={[styles.tempLabel, {color: themeColors.text}]}>
                        {formatTemp(dayTemp)}
                      </Text>
                      <View style={[styles.tempBarHorizontal, {backgroundColor: themeColors.surfaceVariant}]}>
                        <View
                          style={[
                            styles.tempBarFillHorizontal,
                            {
                              backgroundColor: themeColors.primary,
                              left: `${getBarPosition(nightTemp)}%`,
                              width: `${getBarPosition(dayTemp) - getBarPosition(nightTemp)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.tempLabel, {color: themeColors.textSecondary}]}>
                        {formatTemp(nightTemp)}
                      </Text>
                    </View>
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
                  </View>
                ) : (
                  <View style={styles.windContainerRow}>
                    <Icon
                      name="navigation"
                      size={16}
                      color={themeColors.textSecondary}
                      style={{
                        transform: [{rotate: `${(day.day?.wind?.direction ?? 0) + 180}deg`}],
                      }}
                    />
                    <Text style={[styles.windText, {color: themeColors.text}]}>
                      {formatSpeed(day.day?.wind?.speed)}
                    </Text>
                  </View>
                )}
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
                <Text style={[styles.dateLabel, {color: themeColors.textSecondary}]}>
                  {getDateLabel(day.date)}
                </Text>
                
                <Image
                  source={getWeatherIconSource(day.day?.weatherCode, true)}
                  style={styles.weatherIcon}
                  resizeMode="contain"
                />

                {activeTab === 'conditions' && (
                  <>
                    <View style={styles.tempBarContainer}>
                      <Text style={[styles.tempLabel, {color: themeColors.text}]}>
                        {formatTemp(dayTemp)}
                      </Text>
                      <View style={[styles.tempBar, {backgroundColor: themeColors.surfaceVariant}]}>
                        <View
                          style={[
                            styles.tempBarFill,
                            {
                              backgroundColor: themeColors.primary,
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
                  </>
                )}

                {activeTab === 'wind' && (
                  <View style={styles.windContainer}>
                    <Icon
                      name="navigation"
                      size={16}
                      color={themeColors.textSecondary}
                      style={{
                        transform: [{rotate: `${(day.day?.wind?.direction ?? 0) + 180}deg`}],
                      }}
                    />
                    <Text style={[styles.windText, {color: themeColors.text}]}>
                      {formatSpeed(day.day?.wind?.speed)}
                    </Text>
                  </View>
                )}
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  dayRowLeft: {
    width: 70,
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
    marginVertical: 8,
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
