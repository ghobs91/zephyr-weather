import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRoute, RouteProp} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format} from 'date-fns';

import {useWeatherStore} from '../store/weatherStore';
import {colors, getTemperatureColor, getUvColor} from '../theme/colors';
import {WeatherCode, Daily} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';

type DailyDetailRouteProp = RouteProp<RootStackParamList, 'DailyDetail'>;

export function DailyDetailScreen() {
  const route = useRoute<DailyDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  
  const {dayIndex} = route.params;
  const {locations, currentLocationIndex, settings} = useWeatherStore();
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;
  
  const currentLocation = locations[currentLocationIndex];
  const day = currentLocation?.weather?.dailyForecast?.[dayIndex];
  const hourlyForecast = currentLocation?.weather?.hourlyForecast ?? [];

  const formatTemp = (temp?: number): string => {
    if (temp === undefined) return '--°';
    if (settings.temperatureUnit === 'fahrenheit') {
      return `${Math.round(temp * 9/5 + 32)}°`;
    }
    return `${Math.round(temp)}°`;
  };

  const getWeatherIcon = (code?: WeatherCode): string => {
    switch (code) {
      case WeatherCode.CLEAR: return 'weather-sunny';
      case WeatherCode.PARTLY_CLOUDY: return 'weather-partly-cloudy';
      case WeatherCode.CLOUDY: return 'weather-cloudy';
      case WeatherCode.RAIN_LIGHT:
      case WeatherCode.RAIN: return 'weather-rainy';
      case WeatherCode.RAIN_HEAVY: return 'weather-pouring';
      case WeatherCode.SNOW_LIGHT:
      case WeatherCode.SNOW: return 'weather-snowy';
      case WeatherCode.SNOW_HEAVY: return 'weather-snowy-heavy';
      case WeatherCode.THUNDERSTORM: return 'weather-lightning-rainy';
      case WeatherCode.FOG: return 'weather-fog';
      default: return 'weather-sunny';
    }
  };

  if (!day) {
    return (
      <View style={[styles.container, {backgroundColor: themeColors.background}]}>
        <Text style={[styles.errorText, {color: themeColors.text}]}>
          No data available for this day
        </Text>
      </View>
    );
  }

  // Get hourly data for this specific day
  const dayStart = new Date(day.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day.date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayHourly = hourlyForecast.filter(
    h => h.date >= dayStart && h.date <= dayEnd
  );

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <Text style={[styles.dateText, {color: themeColors.text}]}>
            {format(day.date, 'EEEE, MMMM d')}
          </Text>
        </View>

        {/* Main Weather Card */}
        <View style={[styles.mainCard, {backgroundColor: themeColors.cardBackground}]}>
          <View style={styles.halfDayRow}>
            {/* Daytime */}
            <View style={styles.halfDay}>
              <Text style={[styles.halfDayLabel, {color: themeColors.textSecondary}]}>
                Daytime
              </Text>
              <Text style={[styles.halfDayTemp, {color: themeColors.text}]}>
                {formatTemp(day.day?.temperature?.temperature)}
              </Text>
              {day.day?.temperature?.apparent !== undefined && (
                <Text style={[styles.deviation, {color: themeColors.textSecondary}]}>
                  Feels like: {formatTemp(day.day.temperature.apparent)}
                </Text>
              )}
              <View style={styles.weatherRow}>
                <Icon
                  name={getWeatherIcon(day.day?.weatherCode)}
                  size={32}
                  color={themeColors.primary}
                />
                <Text style={[styles.weatherText, {color: themeColors.text}]}>
                  {day.day?.weatherText || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Nighttime */}
            <View style={styles.halfDay}>
              <Text style={[styles.halfDayLabel, {color: themeColors.textSecondary}]}>
                Nighttime
              </Text>
              <Text style={[styles.halfDayTemp, {color: themeColors.text}]}>
                {formatTemp(day.night?.temperature?.temperature)}
              </Text>
              {day.night?.temperature?.apparent !== undefined && (
                <Text style={[styles.deviation, {color: themeColors.textSecondary}]}>
                  Feels like: {formatTemp(day.night.temperature.apparent)}
                </Text>
              )}
              <View style={styles.weatherRow}>
                <Icon name="weather-night" size={32} color={themeColors.textSecondary} />
              </View>
            </View>
          </View>
        </View>

        {/* Temperature Chart Placeholder */}
        <View style={[styles.card, {backgroundColor: themeColors.cardBackground}]}>
          <Text style={[styles.cardTitle, {color: themeColors.text}]}>
            Temperature Trend
          </Text>
          <View style={styles.chartPlaceholder}>
            {dayHourly.slice(0, 12).map((hour, index) => (
              <View key={index} style={styles.chartBar}>
                <View
                  style={[
                    styles.chartBarFill,
                    {
                      backgroundColor: getTemperatureColor(
                        hour.temperature?.temperature ?? 15,
                        useDark
                      ),
                      height: `${Math.max(20, Math.min(100, ((hour.temperature?.temperature ?? 15) + 10) * 2))}%`,
                    },
                  ]}
                />
                <Text style={[styles.chartHour, {color: themeColors.textTertiary}]}>
                  {format(hour.date, 'HH')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Precipitation */}
        <View style={[styles.card, {backgroundColor: themeColors.cardBackground}]}>
          <View style={styles.cardHeader}>
            <Icon name="water" size={20} color={themeColors.primary} />
            <Text style={[styles.cardTitle, {color: themeColors.text}]}>
              Precipitation
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: themeColors.textSecondary}]}>
              Probability
            </Text>
            <Text style={[styles.detailValue, {color: themeColors.text}]}>
              {day.day?.precipitationProbability?.total ?? 0}%
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: themeColors.textSecondary}]}>
              Total
            </Text>
            <Text style={[styles.detailValue, {color: themeColors.text}]}>
              {day.day?.precipitation?.total?.toFixed(1) ?? 0} mm
            </Text>
          </View>
        </View>

        {/* Wind */}
        <View style={[styles.card, {backgroundColor: themeColors.cardBackground}]}>
          <View style={styles.cardHeader}>
            <Icon name="weather-windy" size={20} color={themeColors.primary} />
            <Text style={[styles.cardTitle, {color: themeColors.text}]}>Wind</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: themeColors.textSecondary}]}>
              Speed
            </Text>
            <Text style={[styles.detailValue, {color: themeColors.text}]}>
              {Math.round(day.day?.wind?.speed ?? 0)} km/h
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: themeColors.textSecondary}]}>
              Gusts
            </Text>
            <Text style={[styles.detailValue, {color: themeColors.text}]}>
              {Math.round(day.day?.wind?.gusts ?? 0)} km/h
            </Text>
          </View>
        </View>

        {/* UV Index */}
        {day.uv?.index !== undefined && (
          <View style={[styles.card, {backgroundColor: themeColors.cardBackground}]}>
            <View style={styles.cardHeader}>
              <Icon name="white-balance-sunny" size={20} color={themeColors.primary} />
              <Text style={[styles.cardTitle, {color: themeColors.text}]}>UV Index</Text>
            </View>
            <View style={styles.uvContainer}>
              <Text
                style={[
                  styles.uvValue,
                  {color: getUvColor(day.uv.index, useDark)},
                ]}>
                {day.uv.index}
              </Text>
              <Text style={[styles.uvLevel, {color: themeColors.textSecondary}]}>
                {day.uv.index <= 2 ? 'Low' :
                 day.uv.index <= 5 ? 'Moderate' :
                 day.uv.index <= 7 ? 'High' :
                 day.uv.index <= 10 ? 'Very High' : 'Extreme'}
              </Text>
            </View>
          </View>
        )}

        {/* Sun & Moon */}
        <View style={[styles.card, {backgroundColor: themeColors.cardBackground}]}>
          <View style={styles.sunMoonRow}>
            <View style={styles.sunMoonItem}>
              <Icon name="weather-sunset-up" size={24} color="#FFA500" />
              <Text style={[styles.sunMoonLabel, {color: themeColors.textSecondary}]}>
                Sunrise
              </Text>
              <Text style={[styles.sunMoonTime, {color: themeColors.text}]}>
                {day.sun?.riseTime ? format(day.sun.riseTime, 'HH:mm') : '--:--'}
              </Text>
            </View>
            <View style={styles.sunMoonItem}>
              <Icon name="weather-sunset-down" size={24} color="#FF6B35" />
              <Text style={[styles.sunMoonLabel, {color: themeColors.textSecondary}]}>
                Sunset
              </Text>
              <Text style={[styles.sunMoonTime, {color: themeColors.text}]}>
                {day.sun?.setTime ? format(day.sun.setTime, 'HH:mm') : '--:--'}
              </Text>
            </View>
            <View style={styles.sunMoonItem}>
              <Icon name="white-balance-sunny" size={24} color={themeColors.primary} />
              <Text style={[styles.sunMoonLabel, {color: themeColors.textSecondary}]}>
                Daylight
              </Text>
              <Text style={[styles.sunMoonTime, {color: themeColors.text}]}>
                {day.hoursOfSun?.toFixed(1) ?? '--'}h
              </Text>
            </View>
          </View>
        </View>

        <View style={{height: insets.bottom + 24}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
  dateHeader: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '600',
  },
  mainCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  halfDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfDay: {
    flex: 1,
    alignItems: 'center',
  },
  halfDayLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  halfDayTemp: {
    fontSize: 36,
    fontWeight: '300',
  },
  deviation: {
    fontSize: 12,
    marginTop: 4,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  weatherText: {
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    marginTop: 12,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBarFill: {
    width: 8,
    borderRadius: 4,
  },
  chartHour: {
    fontSize: 10,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  uvContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uvValue: {
    fontSize: 32,
    fontWeight: '600',
  },
  uvLevel: {
    fontSize: 14,
  },
  sunMoonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sunMoonItem: {
    alignItems: 'center',
  },
  sunMoonLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sunMoonTime: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
});
