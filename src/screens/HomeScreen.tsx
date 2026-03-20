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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {fetchWeather, fetchAirQuality} from '../services/openMeteoService';
import {fetchNWSWeather, isUSLocation} from '../services/nwsService';
import {fetchMetNoWeather} from '../services/metnoService';
import {fetchBrightSkyWeather} from '../services/brightSkyService';
import {combineEnsemble, EnsembleSource} from '../services/ensembleService';
import {colors, getTemperatureColor} from '../theme/colors';
import {WeatherCode, Location} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';
import {useResponsiveLayout} from '../utils/platformDetect';
import {formatTime} from '../utils/timeFormat';

import {WeatherIcon} from '../components/WeatherIcon';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnim = useRef(new Animated.Value(0)).current;
  
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
      
      const {latitude, longitude, timezone} = currentLocation;
      const useNWS = await isUSLocation(latitude, longitude);

      // Fire all source fetches in parallel; each is wrapped so a single
      // failure doesn't block the rest — we just drop that source.
      const primaryPromise = useNWS
        ? fetchNWSWeather(latitude, longitude)
            .then(async (w) => {
              // Supplement NWS with air quality from Open-Meteo
              const aq = await fetchAirQuality(latitude, longitude, timezone).catch(() => null);
              if (w.current && aq) w.current.airQuality = aq;
              return {name: 'NWS', weather: w} as EnsembleSource;
            })
            .catch((e) => { console.warn('NWS fetch failed:', e); return null; })
        : fetchWeather(latitude, longitude, timezone)
            .then((w) => ({name: 'Open-Meteo', weather: w} as EnsembleSource))
            .catch((e) => { console.warn('Open-Meteo fetch failed:', e); return null; });

      const metnoPromise = fetchMetNoWeather(latitude, longitude, timezone)
        .then((w) => ({name: 'Met.no', weather: w} as EnsembleSource))
        .catch((e) => { console.warn('Met.no fetch failed:', e); return null; });

      const brightSkyPromise = fetchBrightSkyWeather(latitude, longitude, timezone)
        .then((w) => ({name: 'BrightSky', weather: w} as EnsembleSource))
        .catch((e) => { console.warn('BrightSky fetch failed:', e); return null; });

      const results = await Promise.all([primaryPromise, metnoPromise, brightSkyPromise]);
      const sources = results.filter((r): r is EnsembleSource => r !== null);

      if (sources.length === 0) {
        throw new Error('All weather sources failed');
      }

      console.log(`Ensemble: combining ${sources.length} source(s): ${sources.map(s => s.name).join(', ')}`);
      const weather = combineEnsemble(sources);
      
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

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    Animated.spring(pickerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [pickerAnim]);

  const closePicker = useCallback(() => {
    Animated.timing(pickerAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setPickerOpen(false));
  }, [pickerAnim]);

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

  // Get today's daily data — find the first entry whose local date is today
  // or in the future. dailyForecast[0] may be yesterday when sources include
  // past_days or when daily dates are stored as UTC midnight (which shifts
  // the local date backwards for western timezones).
  const todayLocalKey = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
  const today = dailyForecast.find(
    d => d.date.toLocaleDateString('en-CA') >= todayLocalKey,
  ) ?? dailyForecast[0];
  
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
        
        {/* Spacer so content starts below the floating pill on mobile */}
        {!isDesktop && <View style={{height: 66}} />}

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
          confidence={currentLocation?.weather?.confidence}
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
            {/* Mobile/tablet layout: hourly first, then daily */}
            <HourlyForecastCard
              hourlyForecast={hourlyForecast}
              formatTemp={formatTemp}
              formatSpeed={formatSpeed}
              timeFormat={settings.timeFormat}
              isDark={useDark}
            />

            <DailyForecastCard
              dailyForecast={dailyForecast}
              formatTemp={formatTemp}
              formatSpeed={formatSpeed}
              isDark={useDark}
              onDayPress={(index) => navigation.navigate('DailyDetail', {dayIndex: index})}
              verticalLayout
              precipitationUnit={settings.precipitationUnit}
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

        <View style={{height: insets.bottom + 88}} />
        </View>
      </ScrollView>

      {/* Picker: rendered at root level so it's above ScrollView, backdrop below dropdown */}
      {/* Floating top bar: hamburger | city picker | settings */}
      {!isDesktop && (
        <>
          {/* Backdrop – zIndex 100, behind the picker pill/dropdown (101) */}
          {pickerOpen && (
            <TouchableOpacity
              style={styles.pickerBackdrop}
              onPress={closePicker}
              activeOpacity={1}
            />
          )}

          {/* Top bar row – zIndex 101 */}
          <View
            style={[styles.pickerFloating, {top: insets.top + 8}]}
            pointerEvents="box-none">

            {/* Hamburger – opens Locations */}
            <TouchableOpacity
              style={[
                styles.iconPill,
                {
                  backgroundColor: useDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
                  borderColor: useDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={() => navigation.navigate('Locations')}
              activeOpacity={0.8}>
              <Icon name="menu" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {/* Center: city picker pill + dropdown */}
            <View style={styles.pickerCenter} pointerEvents="box-none">
              <TouchableOpacity
                style={[
                  styles.pickerPill,
                  {
                    backgroundColor: useDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
                    borderColor: useDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                onPress={pickerOpen ? closePicker : openPicker}
                activeOpacity={0.8}>
                {currentLocation.isCurrentPosition && (
                  <Icon name="crosshairs-gps" size={14} color={themeColors.primary} />
                )}
                <Text style={[styles.pickerCityText, {color: themeColors.text}]} numberOfLines={1}>
                  {currentLocation.city || 'Unknown Location'}
                </Text>
                <Icon
                  name={pickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>

              {pickerOpen && (
                <Animated.View
                  style={[
                    styles.pickerDropdown,
                    {
                      backgroundColor: useDark ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.97)',
                      borderColor: useDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                    },
                    {
                      opacity: pickerAnim,
                      transform: [{
                        translateY: pickerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-8, 0],
                        }),
                      }],
                    },
                  ]}>
                  {locations.map((loc, index) => {
                    const isSelected = index === pageIndex;
                    const locCurrent = loc.weather?.current;
                    const locToday = loc.weather?.dailyForecast?.[0];
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        style={[
                          styles.pickerItem,
                          isSelected && {
                            backgroundColor: useDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          },
                        ]}
                        onPress={() => {
                          setCurrentLocationIndex(index);
                          setPageIndex(index);
                          closePicker();
                        }}>
                        <View style={styles.pickerItemLeft}>
                          {loc.isCurrentPosition ? (
                            <Icon name="crosshairs-gps" size={13} color={themeColors.primary} style={{marginRight: 4}} />
                          ) : null}
                          <View>
                            <Text style={[styles.pickerItemCity, {color: themeColors.text}]} numberOfLines={1}>
                              {loc.city || 'Unknown'}
                            </Text>
                            {locToday && (
                              <Text style={[styles.pickerItemSub, {color: themeColors.textSecondary}]}>
                                H:{formatTempShort(locToday.day?.temperature?.temperature)} · L:{formatTempShort(locToday.night?.temperature?.temperature)}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.pickerItemRight}>
                          {locCurrent && (
                            <>
                              <WeatherIcon
                                code={locCurrent.weatherCode}
                                isDay={locCurrent.isDaylight}
                                style={styles.pickerItemIcon}
                              />
                              <Text style={[styles.pickerItemTemp, {color: themeColors.text}]}>
                                {formatTempShort(locCurrent.temperature?.temperature)}
                              </Text>
                            </>
                          )}
                          {isSelected && (
                            <Icon name="check" size={16} color={themeColors.primary} style={{marginLeft: 6}} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              )}
            </View>

            {/* Settings button */}
            <TouchableOpacity
              style={[
                styles.iconPill,
                {
                  backgroundColor: useDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
                  borderColor: useDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}>
              <Icon name="cog-outline" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>

          </View>
        </>
      )}
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
  // Floating location picker (absolutely positioned at root level)
  pickerFloating: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    zIndex: 101,
  },
  pickerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  iconPill: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 16,
  },
  pickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 26,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 16,
    width: '100%',
  },
  pickerCityText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  pickerDropdown: {
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 0.5,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  pickerItemCity: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerItemSub: {
    fontSize: 12,
    marginTop: 1,
  },
  pickerItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerItemIcon: {
    width: 28,
    height: 28,
  },
  pickerItemTemp: {
    fontSize: 18,
    fontWeight: '300',
    marginLeft: 4,
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
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
});
