import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWeatherStore} from '../store/weatherStore';
import {useThemeColors} from '../hooks/useThemeColors';
import {useWeatherFormatters} from '../hooks/useWeatherFormatters';
import {useTodayForecast} from '../hooks/useTodayForecast';
import {normalizeHomeCardOrder, HomeCardId} from '../types/settings';
import {Location} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';

import {DesktopHeader} from './DesktopHeader';
import {AlertBanner} from './AlertBanner';
import {CurrentWeatherCard} from './CurrentWeatherCard';
import {HourlyForecastCard} from './HourlyForecastCard';
import {DailyForecastCard} from './DailyForecastCard';
import {WeatherDetailsSection} from './WeatherDetailsSection';
import {SunMoonCard} from './SunMoonCard';
import {PollenCard} from './PollenCard';
import {TideCard} from './TideCard';
import {AuroraCard} from './AuroraCard';
import {AttributionFooter} from './AttributionFooter';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  location: Location;
  isDesktop: boolean;
}

/**
 * The weather card stack for a single location. Shared by the mobile
 * horizontal location pager and the desktop detail pane.
 */
export function LocationWeatherContent({location, isDesktop}: Props) {
  const navigation = useNavigation<NavigationProp>();
  const {settings} = useWeatherStore();
  const {useDark, themeColors} = useThemeColors();
  const {formatTemp, formatSpeed, formatPressure, formatDistance} =
    useWeatherFormatters();

  const weather = location.weather;
  const current = weather?.current;
  const dailyForecast = weather?.dailyForecast ?? [];
  const hourlyForecast = weather?.hourlyForecast ?? [];
  const minutelyForecast = weather?.minutelyForecast;
  const alerts = weather?.alerts ?? [];
  const today = useTodayForecast(dailyForecast, location.timezone);

  const attributionSource = weather?.base?.attribution
    ? `Weather data from ${weather.base.attribution}`
    : location.countryCode === 'US'
      ? 'Weather data from NOAA National Weather Service'
      : 'Weather data from Open-Meteo & Met.no (CC BY 4.0)';

  // Daily pollen is not populated by providers — fall back to the nearest
  // hourly entry that carries CAMS pollen data.
  const todayPollen =
    today?.pollen ??
    hourlyForecast.find(
      (h) =>
        h.pollen?.grass?.index !== undefined ||
        h.pollen?.tree?.index !== undefined ||
        h.pollen?.ragweed?.index !== undefined,
    )?.pollen;

  const cards: Record<HomeCardId, React.ReactElement> = {
    current: (
      <CurrentWeatherCard
        current={current}
        today={today}
        formatTemp={(t) => formatTemp(t, true)}
        formatSpeed={formatSpeed}
        isDaylight={current?.isDaylight}
        isDark={useDark}
        confidence={weather?.confidence}
        hourlyForecast={hourlyForecast}
        minutelyForecast={minutelyForecast}
        timeFormat={settings.timeFormat}
        compact={isDesktop}
      />
    ),
    hourly: (
      <HourlyForecastCard
        hourlyForecast={hourlyForecast}
        formatTemp={formatTemp}
        formatSpeed={formatSpeed}
        timeFormat={settings.timeFormat}
        isDark={useDark}
      />
    ),
    daily: (
      <DailyForecastCard
        dailyForecast={dailyForecast}
        formatTemp={formatTemp}
        formatSpeed={formatSpeed}
        isDark={useDark}
        onDayPress={(i) => navigation.navigate('DailyDetail', {dayIndex: i})}
        verticalLayout
        precipitationUnit={settings.precipitationUnit}
        timezone={location.timezone}
      />
    ),
    details: (
      <WeatherDetailsSection
        current={current}
        formatSpeed={formatSpeed}
        formatPressure={formatPressure}
        formatDistance={formatDistance}
        isDark={useDark}
        isDesktop={isDesktop}
      />
    ),
    sunmoon: (
      <SunMoonCard
        sun={today?.sun}
        moon={today?.moon}
        hoursOfSun={today?.hoursOfSun}
        timeFormat={settings.timeFormat}
        isDark={useDark}
      />
    ),
    pollen: <PollenCard pollen={todayPollen} isDark={useDark} />,
    tides: (
      <TideCard
        tides={weather?.tides}
        isDark={useDark}
        timeFormat={settings.timeFormat}
      />
    ),
    aurora: (
      <AuroraCard spaceWeather={weather?.spaceWeather} isDark={useDark} />
    ),
  };

  const alertBanner = alerts.length > 0 && (
    <AlertBanner
      alerts={alerts}
      onPress={() => navigation.navigate('Alerts')}
      isDark={useDark}
    />
  );

  const attribution = (
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
  );

  if (isDesktop) {
    return (
      <>
        <DesktopHeader
          location={location}
          weather={weather}
          themeColors={themeColors}
          settings={settings}
        />
        {alertBanner}
        {cards.current}
        <View style={styles.twoColumn}>
          <View style={styles.leftColumn}>{cards.details}</View>
          <View style={styles.rightColumn}>
            {cards.hourly}
            {cards.daily}
          </View>
        </View>
        {cards.sunmoon}
        {cards.pollen}
        {cards.tides}
        {cards.aurora}
        {attribution}
      </>
    );
  }

  const order = normalizeHomeCardOrder(settings.cardOrder);
  return (
    <>
      {alertBanner}
      {order.map((id) => (
        <React.Fragment key={id}>{cards[id]}</React.Fragment>
      ))}
      {attribution}
    </>
  );
}

const styles = StyleSheet.create({
  twoColumn: {flexDirection: 'row', gap: 16, marginBottom: 12},
  // Left column: the small detail squares (wind, pressure, humidity, …).
  leftColumn: {flex: 1},
  // Right column: hourly + daily forecasts, each spanning its full width.
  rightColumn: {flex: 1.75},
});
