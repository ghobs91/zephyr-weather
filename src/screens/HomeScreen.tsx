import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  useColorScheme,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {RootStackParamList} from '../navigation/RootNavigator';
import {useResponsiveLayout} from '../utils/platformDetect';
import {useThemeColors} from '../hooks/useThemeColors';
import {useWeatherFormatters} from '../hooks/useWeatherFormatters';
import {useTodayForecast} from '../hooks/useTodayForecast';
import {useLocationPicker} from '../hooks/useLocationPicker';
import {useWeatherRefresh} from '../hooks/useWeatherRefresh';
import {useDefaultLocation} from '../hooks/useDefaultLocation';

import {AtmosphericBackground} from '../components/AtmosphericBackground';
import {EmptyState} from '../components/EmptyState';
import {LoadingState} from '../components/LoadingState';
import {DesktopHeader} from '../components/DesktopHeader';
import {MobileHeader} from '../components/MobileHeader';
import {AlertBanner} from '../components/AlertBanner';
import {CurrentWeatherCard} from '../components/CurrentWeatherCard';
import {HourlyForecastCard} from '../components/HourlyForecastCard';
import {DailyForecastCard} from '../components/DailyForecastCard';
import {WeatherDetailsSection} from '../components/WeatherDetailsSection';
import {MinutelyPrecipitationCard} from '../components/MinutelyPrecipitationCard';
import {AttributionFooter} from '../components/AttributionFooter';
import {LocationPickerFloating} from '../components/LocationPickerFloating';
import {SkeletonCards} from '../components/SkeletonCards';
import {Location} from '../types/weather';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const {useDark, themeColors} = useThemeColors();

  const {
    locations,
    currentLocationIndex,
    settings,
    isLoading,
    setCurrentLocationIndex,
    removeLocation,
  } = useWeatherStore();

  const [pageIndex, setPageIndex] = useState(currentLocationIndex);
  const {isDesktop, isWideScreen, contentPadding, maxContentWidth} =
    useResponsiveLayout();
  const currentLocation = locations[pageIndex];

  // Sync pageIndex with external changes (e.g. from LocationsScreen)
  useEffect(() => {
    setPageIndex(currentLocationIndex);
  }, [currentLocationIndex]);

  // Hooks
  useDefaultLocation();
  const {refreshing, onRefresh} = useWeatherRefresh(currentLocation);
  const picker = useLocationPicker();
  const {formatTemp, formatTempShort, formatSpeed, formatPressure} =
    useWeatherFormatters();

  const handleDeleteLocation = useCallback(
    (loc: Location) => {
      Alert.alert(
        'Delete Location',
        `Remove ${loc.city || 'this location'}?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => removeLocation(loc.id),
          },
        ],
      );
    },
    [removeLocation],
  );

  // --- Render: states ---

  if (locations.length === 0) {
    return (
      <EmptyState
        themeColors={themeColors}
        onAdd={() => navigation.navigate('SearchLocation')}
      />
    );
  }

  if (!currentLocation) {
    return <LoadingState themeColors={themeColors} />;
  }

  // --- Derived data ---

  const weather = currentLocation.weather;
  const current = weather?.current;
  const dailyForecast = weather?.dailyForecast ?? [];
  const hourlyForecast = weather?.hourlyForecast ?? [];
  const minutelyForecast = weather?.minutelyForecast;
  const alerts = weather?.alerts ?? [];
  const today = useTodayForecast(dailyForecast);

  const attributionSource = currentLocation.countryCode === 'US'
    ? 'Weather data from NOAA National Weather Service'
    : 'Weather data from Open-Meteo & Met.no (CC BY 4.0)';

  const showSkeleton = isLoading && !weather;

  // --- Render: main content ---

  return (
    <AtmosphericBackground isDark={useDark}>
      <View style={styles.container}>
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
          <View
            style={[
              styles.contentContainer,
              {
                paddingTop: isDesktop ? 20 : isWideScreen ? 20 : insets.top,
                paddingHorizontal: contentPadding,
                maxWidth: maxContentWidth,
                alignSelf: maxContentWidth ? 'center' : undefined,
                width: maxContentWidth ? '100%' : undefined,
              },
            ]}>
            {/* Spacer for floating picker on mobile */}
            {!isDesktop && <View style={{height: 66}} />}

            {/* Skeleton loading state */}
            {showSkeleton ? (
              <>
                {!isDesktop && (
                  <MobileHeader weather={undefined} themeColors={themeColors} settings={settings} />
                )}
                <SkeletonCards themeColors={themeColors} isDark={useDark} count={4} />
              </>
            ) : (
              <>
            {/* Header */}
            {isDesktop ? (
              <DesktopHeader
                location={currentLocation}
                weather={weather}
                themeColors={themeColors}
                settings={settings}
              />
            ) : (
              <MobileHeader
                weather={weather}
                themeColors={themeColors}
                settings={settings}
              />
            )}

            {/* Alerts */}
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
              formatTemp={(t) => formatTemp(t, true)}
              formatSpeed={formatSpeed}
              isDaylight={current?.isDaylight}
              isDark={useDark}
              confidence={weather?.confidence}
            />

            {/* Minutely Precipitation (next-hour rain) */}
            {minutelyForecast && minutelyForecast.length > 0 && (
              <MinutelyPrecipitationCard
                minutelyForecast={minutelyForecast}
                isDark={useDark}
              />
            )}

            {/* Hourly */}
            <HourlyForecastCard
              hourlyForecast={hourlyForecast}
              formatTemp={formatTemp}
              formatSpeed={formatSpeed}
              timeFormat={settings.timeFormat}
              isDark={useDark}
            />

            {/* Daily + Details */}
            {isDesktop ? (
              <View style={styles.macTwoColumn}>
                <View style={styles.macLeftColumn}>
                  <DailyForecastCard
                    dailyForecast={dailyForecast}
                    formatTemp={formatTemp}
                    formatSpeed={formatSpeed}
                    isDark={useDark}
                    onDayPress={(i) =>
                      navigation.navigate('DailyDetail', {dayIndex: i})
                    }
                    verticalLayout
                    precipitationUnit={settings.precipitationUnit}
                  />
                </View>
                <WeatherDetailsSection
                  current={current}
                  today={today}
                  formatSpeed={formatSpeed}
                  formatPressure={formatPressure}
                  isDark={useDark}
                  isDesktop
                />
              </View>
            ) : (
              <>
                <DailyForecastCard
                  dailyForecast={dailyForecast}
                  formatTemp={formatTemp}
                  formatSpeed={formatSpeed}
                  isDark={useDark}
                  onDayPress={(i) =>
                    navigation.navigate('DailyDetail', {dayIndex: i})
                  }
                  verticalLayout
                  precipitationUnit={settings.precipitationUnit}
                />
                <WeatherDetailsSection
                  current={current}
                  today={today}
                  formatSpeed={formatSpeed}
                  formatPressure={formatPressure}
                  isDark={useDark}
                />
              </>
            )}

            {/* Attribution */}
            <AttributionFooter
              themeColors={themeColors}
              isDark={useDark}
              sourceName={attributionSource}
              lastUpdated={
                weather?.base?.refreshTime
                  ? new Date(weather.base.refreshTime)
                  : undefined
              }
            />

            <View style={{height: insets.bottom + 88}} />
            </>
            )}
          </View>
        </ScrollView>

        {/* Floating location picker (mobile only) */}
        {!isDesktop && (
          <LocationPickerFloating
            locations={locations}
            pageIndex={pageIndex}
            currentLocation={currentLocation}
            picker={picker}
            formatTempShort={formatTempShort}
            themeColors={themeColors}
            useDark={useDark}
            insets={insets}
            onSelect={(i) => {
              setCurrentLocationIndex(i);
              setPageIndex(i);
              picker.closePicker();
            }}
            onMenuPress={() => navigation.navigate('Locations')}
            onSettingsPress={() => navigation.navigate('Settings')}
          />
        )}
      </View>
    </AtmosphericBackground>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  scrollView: {flex: 1},
  scrollContent: {flexGrow: 1},
  contentContainer: {paddingBottom: 8},
  macTwoColumn: {flexDirection: 'row', gap: 16, marginBottom: 12},
  macLeftColumn: {flex: 0.55},
});
