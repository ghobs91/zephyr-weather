import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Current, Daily, WeatherCode, EnsembleConfidence} from '../types/weather';
import {colors, getTemperatureColor} from '../theme/colors';
import {getCardStyle, getInsetPanelStyle, withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {WeatherIcon} from './WeatherIcon';

interface Props {
  current?: Current;
  today?: Daily;
  formatTemp: (temp?: number) => string;
  formatSpeed?: (speedKmh?: number) => string;
  isDaylight?: boolean;
  isDark: boolean;
  confidence?: EnsembleConfidence;
}

function getConfidenceLabel(overall?: number): {text: string; color: string} {
  if (overall === undefined) return {text: '', color: '#999'};
  if (overall >= 0.75) return {text: 'High confidence', color: '#4CAF50'};
  if (overall >= 0.5) return {text: 'Moderate confidence', color: '#FF9800'};
  return {text: 'Low confidence', color: '#F44336'};
}

export function CurrentWeatherCard({
  current,
  today,
  formatTemp,
  formatSpeed,
  isDaylight = true,
  isDark,
  confidence,
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;
  
  const temperature = current?.temperature?.temperature;
  const feelsLike = current?.temperature?.apparent;
  const weatherCode = current?.weatherCode;
  const weatherText = current?.weatherText;
  const dayTemp = today?.day?.temperature?.temperature;
  const nightTemp = today?.night?.temperature?.temperature;
  const precipChance = today?.day?.precipitationProbability?.total;
  const humidity = current?.relativeHumidity;
  const metrics = [
    {
      key: 'wind',
      icon: 'weather-windy',
      label: 'Wind',
      value: formatSpeed?.(current?.wind?.speed) ?? '--',
    },
    {
      key: 'rain',
      icon: 'weather-rainy',
      label: 'Rain chance',
      value: precipChance !== undefined ? `${Math.round(precipChance)}%` : '--',
    },
    {
      key: 'humidity',
      icon: 'water-percent',
      label: 'Humidity',
      value: humidity !== undefined ? `${Math.round(humidity)}%` : '--',
    },
  ];

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <LinearGradient
        colors={[
          withAlpha(themeColors.accent, isDark ? 0.06 : 0.12),
          withAlpha(themeColors.primary, isDark ? 0.04 : 0.07),
          'transparent',
        ]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, {backgroundColor: withAlpha(themeColors.primary, isDark ? 0.08 : 0.10)}]} />

      <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Current conditions</Text>

      <View style={styles.heroSection}>
        <View style={[styles.iconStage, getInsetPanelStyle(themeColors)]}>
          <WeatherIcon
            code={weatherCode}
            isDay={isDaylight}
            style={styles.weatherIcon}
          />
        </View>

        <View style={styles.temperatureContainer}>
          <Text style={[styles.weatherText, {color: themeColors.textSecondary}]}>
            {weatherText || 'Unknown'}
          </Text>
          <Text
            style={[
              styles.temperature,
              {
                color: temperature !== undefined
                  ? getTemperatureColor(temperature, isDark)
                  : themeColors.text,
              },
            ]}>
            {formatTemp(temperature)}
          </Text>
          <Text style={[styles.dayNightText, {color: themeColors.textSecondary}]}> 
            H:{formatTemp(dayTemp)}   L:{formatTemp(nightTemp)}
          </Text>

          {feelsLike !== undefined && temperature !== undefined && Math.abs(feelsLike - temperature) > 2 && (
            <View style={[styles.feelsLikeChip, {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.08 : 0.55)}]}>
              <Text style={[styles.feelsLike, {color: themeColors.textSecondary}]}>Feels like {formatTemp(feelsLike)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.metricsRow}>
        {metrics.map(metric => (
          <View
            key={metric.key}
            style={[
              styles.metricCard,
              getInsetPanelStyle(themeColors),
              {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.06 : 0.58)},
            ]}>
            <Icon name={metric.icon} size={16} color={themeColors.textSecondary} />
            <Text style={[styles.metricValue, {color: themeColors.text}]} numberOfLines={1}>
              {metric.value}
            </Text>
            <Text style={[styles.metricLabel, {color: themeColors.textTertiary}]}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {confidence && confidence.sourceCount !== undefined && confidence.sourceCount > 1 && (
        <View
          style={[
            styles.confidenceRow,
            getInsetPanelStyle(themeColors),
            {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.05 : 0.48)},
          ]}>
          <View style={[styles.confidenceDot, {backgroundColor: getConfidenceLabel(confidence.overall).color}]} />
          <Text style={[styles.confidenceText, {color: themeColors.textSecondary}]}>
            {getConfidenceLabel(confidence.overall).text}
            {confidence.sourceNames ? ` (${confidence.sourceNames.join(', ')})` : ''}
          </Text>
        </View>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    padding: 22,
    marginBottom: 16,
  },
  glow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    top: 20,
    right: -20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 14,
  },
  iconStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  weatherIcon: {
    width: 138,
    height: 138,
  },
  weatherText: {
    fontSize: 16,
    textAlign: 'center',
  },
  temperatureContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  temperature: {
    fontSize: 68,
    fontWeight: '200',
    lineHeight: 76,
    marginTop: 4,
  },
  feelsLike: {
    fontSize: 13,
    fontWeight: '500',
  },
  feelsLikeChip: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  dayNightText: {
    fontSize: 14,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
  },
});
