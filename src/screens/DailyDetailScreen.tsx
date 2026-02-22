import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Image,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRoute, RouteProp} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format} from 'date-fns';
import {LineChart} from 'react-native-wagmi-charts';

import {useWeatherStore} from '../store/weatherStore';
import {colors, getTemperatureColor, getUvColor} from '../theme/colors';
import {WeatherCode, Daily} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';
import {getWeatherIconSource} from '../utils/weatherIcons';
import {useResponsiveLayout} from '../utils/platformDetect';
import {formatTime} from '../utils/timeFormat';

type DailyDetailRouteProp = RouteProp<RootStackParamList, 'DailyDetail'>;

export function DailyDetailScreen() {
  const route = useRoute<DailyDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  const {width: screenWidth} = useWindowDimensions();
  const layout = useResponsiveLayout();
  
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

  // Calculate chart width based on content width minus card padding
  // Use maxContentWidth if defined, otherwise fall back to screen width
  const effectiveWidth = layout.maxContentWidth
    ? Math.min(screenWidth, layout.maxContentWidth)
    : screenWidth;
  // Card padding (16) + content padding on both sides
  const chartWidth = effectiveWidth - layout.contentPadding * 2 - 32;

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={[
          styles.innerContent,
          {
            paddingHorizontal: layout.contentPadding,
            maxWidth: layout.maxContentWidth,
            alignSelf: layout.maxContentWidth ? 'center' : undefined,
            width: layout.maxContentWidth ? '100%' : undefined,
          },
        ]}>
        
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
                <Image
                  source={getWeatherIconSource(day.day?.weatherCode, true)}
                  style={styles.weatherIcon}
                  resizeMode="contain"
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
                <Image
                  source={getWeatherIconSource(day.night?.weatherCode, false)}
                  style={styles.weatherIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Temperature Chart */}
        <View style={[styles.card, {backgroundColor: themeColors.cardBackground}]}>
          <Text style={[styles.cardTitle, {color: themeColors.text}]}>
            Temperature Trend
          </Text>
          {dayHourly.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContent}
              style={styles.chartScrollView}>
              <View style={styles.chartContainer}>
                {/* Weather icons row */}
                <View style={styles.chartIconsRow}>
                  {dayHourly.filter((_, i) => i % 3 === 0 || i === dayHourly.length - 1).map((hour, index) => (
                    <View key={index} style={{alignItems: 'center'}}>
                      <Image
                        source={getWeatherIconSource(hour.weatherCode, hour.isDaylight)}
                        style={{width: 16, height: 16}}
                        resizeMode="contain"
                      />
                    </View>
                  ))}
                </View>

                {/* Interactive temperature chart */}
                <LineChart.Provider
                  data={dayHourly.map((hour, index) => {
                    const tempC = hour.temperature?.temperature ?? 0;
                    const tempConverted = settings.temperatureUnit === 'fahrenheit' 
                      ? tempC * 9/5 + 32 
                      : tempC;
                    return {
                      timestamp: index,
                      value: tempConverted,
                    };
                  })}
                  yRange={{
                    min: Math.min(...dayHourly.map(h => {
                      const tempC = h.temperature?.temperature ?? 0;
                      return settings.temperatureUnit === 'fahrenheit' ? tempC * 9/5 + 32 : tempC;
                    })) - 2,
                    max: Math.max(...dayHourly.map(h => {
                      const tempC = h.temperature?.temperature ?? 0;
                      return settings.temperatureUnit === 'fahrenheit' ? tempC * 9/5 + 32 : tempC;
                    })) + 2,
                  }}>
                  <LineChart height={120} width={chartWidth}>
                    <LineChart.Path color={themeColors.primary} width={2}>
                      <LineChart.Gradient color={themeColors.primary} />
                    </LineChart.Path>
                    <LineChart.CursorCrosshair
                      color={themeColors.primary}>
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
                          format={({value}) => {
                            'worklet';
                            return `${Math.round(value)}°`;
                          }}
                        />
                      </LineChart.Tooltip>
                    </LineChart.CursorCrosshair>
                  </LineChart>
                </LineChart.Provider>

                {/* Hour labels */}
                <View style={styles.chartHoursRow}>
                  {dayHourly.filter((_, i) => i % 3 === 0 || i === dayHourly.length - 1).map((hour, index) => (
                    <Text
                      key={index}
                      style={[styles.chartHour, {color: themeColors.textSecondary}]}>
                      {formatTime(hour.date, settings.timeFormat, {showMinutes: false, lowercase: true})}
                    </Text>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : (
            <Text style={[styles.noDataText, {color: themeColors.textSecondary}]}>
              No hourly data available
            </Text>
          )}
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
              {(day.day?.precipitation?.snow ?? 0) > 0 ? 'Total (liquid equiv.)' : 'Total'}
            </Text>
            <Text style={[styles.detailValue, {color: themeColors.text}]}>
              {(() => {
                const total = day.day?.precipitation?.total;
                if (total === undefined || total === null) return '--';
                if (settings.precipitationUnit === 'inch') {
                  return `${Math.round(total / 25.4 * 100) / 100} in`;
                }
                return `${Math.round(total)} mm`;
              })()}
            </Text>
          </View>
          {(day.day?.precipitation?.snow ?? 0) > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, {color: themeColors.textSecondary}]}>
                Snow Accumulation
              </Text>
              <Text style={[styles.detailValue, {color: themeColors.text}]}>
                {(() => {
                  // precipitation.snow is stored in cm (from Open-Meteo snowfall_sum)
                  const snowCm = day.day!.precipitation!.snow!;
                  if (settings.precipitationUnit === 'inch') {
                    return `${Math.round(snowCm / 2.54 * 10) / 10} in`;
                  }
                  return `${Math.round(snowCm * 10)} mm`;
                })()}
              </Text>
            </View>
          )}
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
              {(() => {
                const speed = day.day?.wind?.speed ?? 0;
                if (settings.speedUnit === 'mph') {
                  return `${Math.round(speed * 0.621371)} mph`;
                } else if (settings.speedUnit === 'ms') {
                  return `${Math.round(speed / 3.6)} m/s`;
                } else if (settings.speedUnit === 'kn') {
                  return `${Math.round(speed * 0.539957)} kn`;
                }
                return `${Math.round(speed)} km/h`;
              })()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: themeColors.textSecondary}]}>
              Gusts
            </Text>
            <Text style={[styles.detailValue, {color: themeColors.text}]}>
              {(() => {
                const gusts = day.day?.wind?.gusts;
                if (gusts === undefined || gusts === null) return '--';
                if (settings.speedUnit === 'mph') {
                  return `${Math.round(gusts * 0.621371)} mph`;
                } else if (settings.speedUnit === 'ms') {
                  return `${Math.round(gusts / 3.6)} m/s`;
                } else if (settings.speedUnit === 'kn') {
                  return `${Math.round(gusts * 0.539957)} kn`;
                }
                return `${Math.round(gusts)} km/h`;
              })()}
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
                {formatTime(day.sun?.riseTime ? new Date(day.sun.riseTime) : undefined, settings.timeFormat)}
              </Text>
            </View>
            <View style={styles.sunMoonItem}>
              <Icon name="weather-sunset-down" size={24} color="#FF6B35" />
              <Text style={[styles.sunMoonLabel, {color: themeColors.textSecondary}]}>
                Sunset
              </Text>
              <Text style={[styles.sunMoonTime, {color: themeColors.text}]}>
                {formatTime(day.sun?.setTime ? new Date(day.sun.setTime) : undefined, settings.timeFormat)}
              </Text>
            </View>
            <View style={styles.sunMoonItem}>
              <Icon name="white-balance-sunny" size={24} color={themeColors.primary} />
              <Text style={[styles.sunMoonLabel, {color: themeColors.textSecondary}]}>
                Daylight
              </Text>
              <Text style={[styles.sunMoonTime, {color: themeColors.text}]}>
                {(() => {
                  if (!day.sun?.riseTime || !day.sun?.setTime) return '--h';
                  const rise = new Date(day.sun.riseTime);
                  const set = new Date(day.sun.setTime);
                  const hours = (set.getTime() - rise.getTime()) / (1000 * 60 * 60);
                  const wholeHours = Math.floor(hours);
                  const minutes = Math.round((hours - wholeHours) * 60);
                  return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
                })()}
              </Text>
            </View>
          </View>
        </View>

        <View style={{height: insets.bottom + 24}} />
        </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  innerContent: {
    paddingVertical: 16,
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
  weatherIcon: {
    width: 32,
    height: 32,
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
  chartScrollView: {
    marginTop: 16,
  },
  chartScrollContent: {
    paddingRight: 16,
  },
  chartContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  chartIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  chartHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  chartHour: {
    fontSize: 10,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
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
