import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Current, Daily} from '../types/weather';
import {WeatherDetailCard} from './WeatherDetailCard';
import {AirQualityCard} from './AirQualityCard';

interface Props {
  current?: Current;
  today?: Daily;
  formatSpeed: (speedKmh?: number) => string;
  formatPressure: (hPa?: number) => string;
  isDark: boolean;
  isDesktop?: boolean;
}

/**
 * Renders the detail cards grid (precipitation, wind, pressure, humidity,
 * UV, dew point, visibility) with an optional air quality card.
 *
 * On desktop it is used inside a flex column; on mobile/tablet it uses its
 * own wrapping grid.
 */
export function WeatherDetailsSection({
  current,
  today,
  formatSpeed,
  formatPressure,
  isDark,
  isDesktop,
}: Props) {
  const cards = (
    <>
      <WeatherDetailCard
        title="Precipitation"
        value={`${Math.round(today?.day?.precipitationProbability?.total ?? 0)}%`}
        subtitle="Chance of rain"
        icon="water-percent"
        isDark={isDark}
      />
      <WeatherDetailCard
        title="Wind"
        value={formatSpeed(current?.wind?.speed)}
        subtitle={current?.wind?.gusts ? `Gusts: ${formatSpeed(current.wind.gusts)}` : undefined}
        icon="weather-windy"
        isDark={isDark}
      />
      <WeatherDetailCard
        title="Pressure"
        value={formatPressure(current?.pressure)}
        icon="gauge"
        isDark={isDark}
      />
      <WeatherDetailCard
        title="Humidity"
        value={
          current?.relativeHumidity !== undefined
            ? `${Math.round(current.relativeHumidity)}%`
            : '--'
        }
        icon="water-percent"
        isDark={isDark}
      />
      {current?.uv?.index !== undefined && (
        <WeatherDetailCard
          title="UV Index"
          value={`${Math.round(current.uv.index)}`}
          subtitle={getUvLevel(current.uv.index)}
          icon="white-balance-sunny"
          isDark={isDark}
        />
      )}
      {current?.dewPoint !== undefined && (
        <WeatherDetailCard
          title="Dew Point"
          value={`${Math.round(current.dewPoint)}°`}
          subtitle="Comfort indicator"
          icon="thermometer-low"
          isDark={isDark}
        />
      )}
      {current?.visibility !== undefined && (
        <WeatherDetailCard
          title="Visibility"
          value={formatVisibility(current.visibility)}
          icon="eye-outline"
          isDark={isDark}
        />
      )}
      {current?.airQuality && !isDesktop && (
        <AirQualityCard airQuality={current.airQuality} isDark={isDark} />
      )}
    </>
  );

  if (isDesktop) {
    return <View style={styles.desktop}>{cards}</View>;
  }

  return <View style={styles.grid}>{cards}</View>;
}

function getUvLevel(index: number): string {
  if (index <= 2) return 'Low';
  if (index <= 5) return 'Moderate';
  if (index <= 7) return 'High';
  if (index <= 10) return 'Very High';
  return 'Extreme';
}

function formatVisibility(meters?: number): string {
  if (meters === undefined) return '--';
  if (meters >= 10000) return `${(meters / 1000).toFixed(0)} km`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12},
  desktop: {flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start'},
});
