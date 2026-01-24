import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format, isToday, isSameHour} from 'date-fns';
import {Hourly, WeatherCode} from '../types/weather';
import {colors, getTemperatureColor} from '../theme/colors';

interface Props {
  hourlyForecast: Hourly[];
  formatTemp: (temp?: number) => string;
  getWeatherIcon: (code?: WeatherCode, isDay?: boolean) => string;
  isDark: boolean;
}

type TabType = 'conditions' | 'air_quality' | 'wind';

export function HourlyForecastCard({
  hourlyForecast,
  formatTemp,
  getWeatherIcon,
  isDark,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('conditions');
  const themeColors = isDark ? colors.dark : colors.light;

  const now = new Date();
  
  // Filter to show from current hour onwards, limit to 24 hours
  const filteredHours = hourlyForecast
    .filter(hour => hour.date >= now)
    .slice(0, 24);

  // Get temperature range for chart
  const temps = filteredHours
    .map(h => h.temperature?.temperature)
    .filter((t): t is number => t !== undefined);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  const getTempPosition = (temp?: number): number => {
    if (temp === undefined) return 50;
    return 100 - ((temp - minTemp) / tempRange) * 100;
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.header}>
        <Icon name="clock-outline" size={20} color={themeColors.textSecondary} />
        <Text style={[styles.title, {color: themeColors.text}]}>Hourly forecast</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'conditions' && {backgroundColor: themeColors.primary},
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
            activeTab === 'air_quality' && {backgroundColor: themeColors.primary},
          ]}
          onPress={() => setActiveTab('air_quality')}>
          <Text
            style={[
              styles.tabText,
              {color: activeTab === 'air_quality' ? '#FFFFFF' : themeColors.textSecondary},
            ]}>
            Air quality
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'wind' && {backgroundColor: themeColors.primary},
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hoursContainer}>
        {filteredHours.map((hour, index) => {
          const temp = hour.temperature?.temperature;
          const isNow = isSameHour(hour.date, now);
          const precipProb = hour.precipitationProbability?.total;

          return (
            <View key={hour.date.toISOString()} style={styles.hourColumn}>
              <Text
                style={[
                  styles.hourLabel,
                  {color: isNow ? themeColors.primary : themeColors.text},
                ]}>
                {isNow ? 'Now' : format(hour.date, 'HH:mm')}
              </Text>

              <Icon
                name={getWeatherIcon(hour.weatherCode, hour.isDaylight)}
                size={24}
                color={themeColors.primary}
                style={styles.weatherIcon}
              />

              {activeTab === 'conditions' && (
                <>
                  <View style={styles.chartContainer}>
                    <View
                      style={[
                        styles.tempDot,
                        {
                          backgroundColor: temp !== undefined
                            ? getTemperatureColor(temp, isDark)
                            : themeColors.primary,
                          top: `${getTempPosition(temp)}%`,
                        },
                      ]}
                    />
                    {index < filteredHours.length - 1 && (
                      <View
                        style={[
                          styles.chartLine,
                          {backgroundColor: themeColors.surfaceVariant},
                        ]}
                      />
                    )}
                  </View>

                  <Text style={[styles.tempText, {color: themeColors.text}]}>
                    {formatTemp(temp)}
                  </Text>

                  {precipProb !== undefined && precipProb > 0 && (
                    <View style={styles.precipContainer}>
                      <Icon name="water" size={10} color={themeColors.rain} />
                      <Text style={[styles.precipText, {color: themeColors.rain}]}>
                        {Math.round(precipProb)}%
                      </Text>
                    </View>
                  )}
                </>
              )}

              {activeTab === 'wind' && (
                <View style={styles.windInfo}>
                  <Icon
                    name="navigation"
                    size={14}
                    color={themeColors.textSecondary}
                    style={{
                      transform: [{rotate: `${(hour.wind?.direction ?? 0) + 180}deg`}],
                    }}
                  />
                  <Text style={[styles.windText, {color: themeColors.text}]}>
                    {Math.round(hour.wind?.speed ?? 0)}
                  </Text>
                </View>
              )}

              {activeTab === 'air_quality' && (
                <View style={styles.aqiInfo}>
                  <Text style={[styles.aqiText, {color: themeColors.text}]}>
                    {hour.airQuality?.aqi ?? '--'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Normal range indicator */}
      <View style={styles.normalRange}>
        <View style={[styles.normalLine, {backgroundColor: themeColors.border}]} />
        <Text style={[styles.normalText, {color: themeColors.textTertiary}]}>Normal</Text>
      </View>
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
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '500',
  },
  hoursContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  hourColumn: {
    alignItems: 'center',
    width: 56,
  },
  hourLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  weatherIcon: {
    marginVertical: 8,
  },
  chartContainer: {
    height: 60,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  tempDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    zIndex: 1,
  },
  chartLine: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: 0,
    height: 2,
  },
  tempText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  precipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  precipText: {
    fontSize: 10,
  },
  windInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  windText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  aqiInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  aqiText: {
    fontSize: 14,
    fontWeight: '500',
  },
  normalRange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  normalLine: {
    flex: 1,
    height: 1,
  },
  normalText: {
    fontSize: 10,
  },
});
