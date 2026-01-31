import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format, isSameHour} from 'date-fns';
import {Hourly, WeatherCode} from '../types/weather';
import {colors} from '../theme/colors';

interface Props {
  hourlyForecast: Hourly[];
  formatTemp: (temp?: number) => string;
  formatSpeed: (speedKmh?: number) => string;
  getWeatherIcon: (code?: WeatherCode, isDay?: boolean) => string;
  isDark: boolean;
}

type TabType = 'conditions' | 'wind';

export function HourlyForecastCard({
  hourlyForecast,
  formatTemp,
  formatSpeed,
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

              <Text style={styles.weatherIcon}>
                {getWeatherIcon(hour.weatherCode, hour.isDaylight)}
              </Text>

              {activeTab === 'conditions' && (
                <>
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
                    {formatSpeed(hour.wind?.speed)}
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
    fontSize: 24,
    marginVertical: 4,
  },
  tempText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
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
