import React, {useEffect, useCallback, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
  TouchableOpacity,
  Platform,
  Animated,
  Alert,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {fetchWeather, fetchAirQuality} from '../services/openMeteoService';
import {fetchNWSWeather, isUSLocation} from '../services/nwsService';
import {colors, getTemperatureColor} from '../theme/colors';
import {WeatherCode, Location} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';
import {useResponsiveLayout} from '../utils/platformDetect';
import {formatTime} from '../utils/timeFormat';

import {getWeatherIconSource} from '../utils/weatherIcons';
import {CurrentWeatherCard} from '../components/CurrentWeatherCard';
import {DailyForecastCard} from '../components/DailyForecastCard';
import {HourlyForecastCard} from '../components/HourlyForecastCard';
import {WeatherDetailCard} from '../components/WeatherDetailCard';
import {AlertBanner} from '../components/AlertBanner';
import {AirQualityCard} from '../components/AirQualityCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  
  const {
    locations,
    currentLocationIndex,
    settings,
    isLoading,
    updateLocationWeather,
    setLoading,
    setError,
    addLocation,
    setCurrentLocationIndex,
    removeLocation,
  } = useWeatherStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(currentLocationIndex);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-300)).current;
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;
  
  const currentLocation = locations[pageIndex];
  const layout = useResponsiveLayout();
  const {isDesktop, isWideScreen, contentPadding, maxContentWidth, detailColumns} = layout;

  // Sync pageIndex with currentLocationIndex when it changes from outside (e.g., LocationsScreen)
  useEffect(() => {
    setPageIndex(currentLocationIndex);
  }, [currentLocationIndex]);

  const refreshWeather = useCallback(async () => {
    if (!currentLocation) return;
    
    try {
      setLoading(true);
      
      // Check if location is in the US and use NWS if available
      const useNWS = await isUSLocation(
        currentLocation.latitude,
        currentLocation.longitude
      );
      
      let weather;
      if (useNWS) {
        console.log('Using NWS API for US location');
        weather = await fetchNWSWeather(
          currentLocation.latitude,
          currentLocation.longitude
        );
        
        // Fetch air quality from Open-Meteo since NWS doesn't provide it
        const airQuality = await fetchAirQuality(
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.timezone
        );
        
        if (weather.current && airQuality) {
          weather.current.airQuality = airQuality;
        }
      } else {
        console.log('Using Open-Meteo API for international location');
        weather = await fetchWeather(
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.timezone
        );
      }
      
      updateLocationWeather(currentLocation.id, weather);
    } catch (error) {
      setError('Failed to fetch weather data');
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocation, setLoading, updateLocationWeather, setError]);

  useEffect(() => {
    // Add a default location if none exists
    if (locations.length === 0) {
      // Default to New York
      addLocation({
        id: 'default',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        city: 'New York',
        province: 'New York',
        country: 'United States',
        countryCode: 'US',
        isCurrentPosition: false,
        forecastSource: 'nws',
      });
    }
  }, [locations.length, addLocation]);

  useEffect(() => {
    if (currentLocation && !currentLocation.weather) {
      refreshWeather();
    }
  }, [currentLocation, refreshWeather]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [drawerAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: -300,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }, [drawerAnim]);

  const handleDeleteLocation = useCallback((location: Location) => {
    Alert.alert(
      'Delete Location',
      `Remove ${location.city || 'this location'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: () => removeLocation(location.id)},
      ]
    );
  }, [removeLocation]);

  const formatTempShort = useCallback((temp?: number) => {
    if (temp === undefined) return '--°';
    if (settings.temperatureUnit === 'fahrenheit') {
      return `${Math.round(temp * 9/5 + 32)}°`;
    }
    return `${Math.round(temp)}°`;
  }, [settings.temperatureUnit]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshWeather();
  }, [refreshWeather]);

  if (locations.length === 0) {
    return (
      <View style={[styles.emptyContainer, {backgroundColor: themeColors.background}]}>
        <Icon name="map-marker-plus" size={64} color={themeColors.textSecondary} />
        <Text style={[styles.emptyText, {color: themeColors.text}]}>
          No locations added
        </Text>
        <Text style={[styles.emptySubtext, {color: themeColors.textSecondary}]}>
          Add a location to see weather data
        </Text>
        <TouchableOpacity
          style={[styles.addButton, {backgroundColor: themeColors.primary}]}
          onPress={() => navigation.navigate('SearchLocation')}>
          <Text style={styles.addButtonText}>Add Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: themeColors.background}]}>
        <Text style={[styles.loadingText, {color: themeColors.text}]}>Loading...</Text>
      </View>
    );
  }

  const weather = currentLocation.weather;
  const current = weather?.current;
  const dailyForecast = weather?.dailyForecast ?? [];
  const hourlyForecast = weather?.hourlyForecast ?? [];
  const alerts = weather?.alerts ?? [];

  // Get today's daily data
  const today = dailyForecast[0];
  
  // Format temperature based on settings
  const formatTemp = (temp?: number) => {
    if (temp === undefined) return '--';
    if (settings.temperatureUnit === 'fahrenheit') {
      return `${Math.round(temp * 9/5 + 32)}°F`;
    }
    return `${Math.round(temp)}°C`;
  };

  // Format speed based on settings (input is always km/h)
  const formatSpeed = (speedKmh?: number) => {
    if (speedKmh === undefined) return '--';
    switch (settings.speedUnit) {
      case 'mph':
        return `${Math.round(speedKmh * 0.621371)} mph`;
      case 'ms':
        return `${Math.round(speedKmh * 0.277778)} m/s`;
      case 'kn':
        return `${Math.round(speedKmh * 0.539957)} kn`;
      default: // kmh
        return `${Math.round(speedKmh)} km/h`;
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={[
          styles.contentContainer,
          {
            paddingTop: isDesktop ? 20 : isWideScreen ? 20 : insets.top,
            paddingHorizontal: contentPadding,
            maxWidth: maxContentWidth,
            alignSelf: maxContentWidth ? 'center' : undefined,
            width: maxContentWidth ? '100%' : undefined,
          },
        ]}>
        
        {/* Location Header - Hide on macOS desktop layout */}
        {!isDesktop && (
          <>
            <View style={styles.header}>
              <View style={styles.locationHeader}>
                <TouchableOpacity
                  onPress={openDrawer}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Icon name="menu" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.locationName, {color: themeColors.text}]}>
                  {currentLocation.city || 'Unknown Location'}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SearchLocation')}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Icon name="pencil" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {weather?.base?.refreshTime && (
                <Text style={[styles.updateTime, {color: themeColors.textSecondary}]}>
                  <Icon name="clock-outline" size={12} color={themeColors.textSecondary} />{' '}
                  {formatTime(new Date(weather.base.refreshTime), settings.timeFormat)}
                </Text>
              )}
            </View>
          </>
        )}

        {/* macOS: Show location name and HOME badge at top */}
        {isDesktop && (
          <View style={styles.macHeader}>
            <View>
              <Text style={[styles.macLocationName, {color: themeColors.text}]}>
                {currentLocation.city || 'Unknown Location'}
              </Text>
              {currentLocation.isCurrentPosition && (
                <View style={styles.homeBadge}>
                  <Icon name="map-marker" size={12} color={themeColors.textSecondary} />
                  <Text style={[styles.homeBadgeText, {color: themeColors.textSecondary}]}>Current Location</Text>
                </View>
              )}
            </View>
            {weather?.base?.refreshTime && (
              <Text style={[styles.macUpdateTime, {color: themeColors.textSecondary}]}>
                Updated {formatTime(new Date(weather.base.refreshTime), settings.timeFormat)}
              </Text>
            )}
          </View>
        )}

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <AlertBanner
            alerts={alerts}
            onPress={() => navigation.navigate('Alerts')}
            isDark={useDark}
          />
        )}

        {/* Current Weather */}
        <CurrentWeatherCard
          current={current}
          today={today}
          formatTemp={formatTemp}
          isDaylight={current?.isDaylight}
          isDark={useDark}
        />

        {isDesktop ? (
          <>
            {/* macOS layout: Hourly on top, then two-column row with air quality in right column */}
            <HourlyForecastCard
              hourlyForecast={hourlyForecast}
              formatTemp={formatTemp}
              formatSpeed={formatSpeed}
              timeFormat={settings.timeFormat}
              isDark={useDark}
            />

            <View style={styles.macTwoColumn}>
              <View style={styles.macLeftColumn}>
                <DailyForecastCard
                  dailyForecast={dailyForecast}
                  formatTemp={formatTemp}
                  formatSpeed={formatSpeed}
                  isDark={useDark}
                  onDayPress={(index) => navigation.navigate('DailyDetail', {dayIndex: index})}
                  verticalLayout
                  precipitationUnit={settings.precipitationUnit}
                />
              </View>
              <View style={styles.macRightColumn}>
                <WeatherDetailCard
                  title="Precipitation"
                  value={`${Math.round(today?.day?.precipitationProbability?.total ?? 0)}%`}
                  subtitle="Chance of rain"
                  icon="water-percent"
                  isDark={useDark}
                />
                <WeatherDetailCard
                  title="Wind"
                  value={formatSpeed(current?.wind?.speed)}
                  subtitle={current?.wind?.gusts ? `Gusts: ${formatSpeed(current.wind.gusts)}` : undefined}
                  icon="weather-windy"
                  isDark={useDark}
                />
                <WeatherDetailCard
                  title="Pressure"
                  value={`${Math.round(current?.pressure ?? 0)} hPa`}
                  icon="gauge"
                  isDark={useDark}
                />
                <WeatherDetailCard
                  title="Humidity"
                  value={current?.relativeHumidity !== undefined ? `${Math.round(current.relativeHumidity)}%` : '--'}
                  icon="water-percent"
                  isDark={useDark}
                />
                
                {current?.airQuality && (
                  <View style={styles.macAirQualityContainer}>
                    <AirQualityCard
                      airQuality={current.airQuality}
                      isDark={useDark}
                    />
                  </View>
                )}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Mobile/tablet layout: original order */}
            <DailyForecastCard
              dailyForecast={dailyForecast}
              formatTemp={formatTemp}
              formatSpeed={formatSpeed}
              isDark={useDark}
              onDayPress={(index) => navigation.navigate('DailyDetail', {dayIndex: index})}
              precipitationUnit={settings.precipitationUnit}
            />

            <HourlyForecastCard
              hourlyForecast={hourlyForecast}
              formatTemp={formatTemp}
              formatSpeed={formatSpeed}
              timeFormat={settings.timeFormat}
              isDark={useDark}
            />

            <View style={[styles.detailsGrid, detailColumns === 4 && styles.detailsGridWide]}>
              <WeatherDetailCard
                title="Precipitation"
                value={`${Math.round(today?.day?.precipitationProbability?.total ?? 0)}%`}
                subtitle="Chance of rain"
                icon="water-percent"
                isDark={useDark}
              />
              <WeatherDetailCard
                title="Wind"
                value={formatSpeed(current?.wind?.speed)}
                subtitle={current?.wind?.gusts ? `Gusts: ${formatSpeed(current.wind.gusts)}` : undefined}
                icon="weather-windy"
                isDark={useDark}
              />
              <WeatherDetailCard
                title="Pressure"
                value={`${Math.round(current?.pressure ?? 0)} hPa`}
                icon="gauge"
                isDark={useDark}
              />
              <WeatherDetailCard
                title="Humidity"
                value={current?.relativeHumidity !== undefined ? `${Math.round(current.relativeHumidity)}%` : '--'}
                icon="water-percent"
                isDark={useDark}
              />
            </View>

            {current?.airQuality && (
              <AirQualityCard
                airQuality={current.airQuality}
                isDark={useDark}
              />
            )}
          </>
        )}

        {/* Attribution */}
        <View style={styles.attribution}>
          <Text style={[styles.attributionText, {color: themeColors.textTertiary}]}>
            {currentLocation.countryCode === 'US' 
              ? 'Weather data from NOAA National Weather Service'
              : 'Weather data from Open-Meteo (CC BY 4.0)'}
          </Text>
        </View>

        <View style={{height: insets.bottom + 16}} />
        </View>
      </ScrollView>

      {/* Locations Drawer */}
      <Modal
        transparent
        visible={drawerOpen}
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent>
        <TouchableOpacity
          style={styles.drawerBackdrop}
          onPress={closeDrawer}
          activeOpacity={1}
        />
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: themeColors.background,
              transform: [{translateX: drawerAnim}],
            },
          ]}>
          <View style={[styles.drawerHeader, {paddingTop: insets.top + 16}]}>
            <Text style={[styles.drawerTitle, {color: themeColors.text}]}>Locations</Text>
            <TouchableOpacity
              style={[styles.drawerAddBtn, {backgroundColor: themeColors.primary}]}
              onPress={() => {
                closeDrawer();
                setTimeout(() => navigation.navigate('SearchLocation'), 250);
              }}>
              <Icon name="plus" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={({item, index}) => {
              const isSelected = index === pageIndex;
              const current = item.weather?.current;
              const today = item.weather?.dailyForecast?.[0];
              return (
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    {
                      backgroundColor: isSelected
                        ? (useDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
                        : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setCurrentLocationIndex(index);
                    setPageIndex(index);
                    closeDrawer();
                  }}
                  onLongPress={() => handleDeleteLocation(item)}>
                  <View style={styles.drawerItemTop}>
                    <View style={styles.drawerItemTitleRow}>
                      {item.isCurrentPosition && (
                        <Icon name="crosshairs-gps" size={13} color={themeColors.primary} />
                      )}
                      <Text
                        style={[styles.drawerItemCity, {color: themeColors.text}]}
                        numberOfLines={1}>
                        {item.city || 'Unknown'}
                      </Text>
                    </View>
                    {current ? (
                      <View style={styles.drawerItemWeather}>
                        <Image
                          source={getWeatherIconSource(current.weatherCode, current.isDaylight)}
                          style={styles.drawerItemIcon}
                          resizeMode="contain"
                        />
                        <Text style={[styles.drawerItemTemp, {color: themeColors.text}]}>
                          {formatTempShort(current.temperature?.temperature)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.drawerItemTemp, {color: themeColors.textSecondary}]}>
                        --°
                      </Text>
                    )}
                  </View>
                  {current && (
                    <Text
                      style={[styles.drawerItemCondition, {color: themeColors.textSecondary}]}
                      numberOfLines={1}>
                      {current.weatherText}
                    </Text>
                  )}
                  {today && (
                    <Text style={[styles.drawerItemDayNight, {color: themeColors.textTertiary}]}>
                      H: {formatTempShort(today.day?.temperature?.temperature)} · L:{' '}
                      {formatTempShort(today.night?.temperature?.temperature)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.drawerList}
            ListEmptyComponent={
              <View style={styles.drawerEmpty}>
                <Icon name="map-marker-off" size={48} color={themeColors.textSecondary} />
                <Text style={[styles.drawerEmptyText, {color: themeColors.textSecondary}]}>
                  No locations yet
                </Text>
              </View>
            }
          />
        </Animated.View>
      </Modal>
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
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
    marginTop: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationName: {
    fontSize: 22,
    fontWeight: '600',
    flex: 1,
  },
  updateTime: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 36,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  macHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macLocationName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  homeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  homeBadgeText: {
    fontSize: 13,
    fontWeight: '400',
  },
  macUpdateTime: {
    fontSize: 14,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailsGridWide: {
    // On wider screens all 4 cards fit in one row
  },
  macTwoColumn: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  macLeftColumn: {
    flex: 1,
  },
  macRightColumn: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignContent: 'flex-start',
  },
  macAirQualityContainer: {
    width: '100%',
  },
  attribution: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  attributionText: {
    fontSize: 12,
  },
  // Drawer
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    shadowColor: '#000',
    shadowOffset: {width: 3, height: 0},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  drawerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  drawerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerList: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  drawerItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  drawerItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  drawerItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  drawerItemCity: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  drawerItemWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drawerItemIcon: {
    width: 28,
    height: 28,
  },
  drawerItemTemp: {
    fontSize: 22,
    fontWeight: '300',
  },
  drawerItemCondition: {
    fontSize: 13,
    marginBottom: 2,
  },
  drawerItemDayNight: {
    fontSize: 12,
  },
  drawerEmpty: {
    alignItems: 'center',
    paddingTop: 48,
  },
  drawerEmptyText: {
    fontSize: 15,
    marginTop: 12,
  },
});
