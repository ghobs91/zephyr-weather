import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AirQuality} from '../types/weather';
import {colors} from '../theme/colors';

interface Props {
  humidity?: number;
  airQuality?: AirQuality;
  isDark: boolean;
}

export function HumidityAirQualityCard({humidity, airQuality, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  const getAQILevel = (aqi?: number): {label: string; color: string} => {
    if (aqi === undefined || aqi < 0) return {label: 'Unknown', color: themeColors.textSecondary};
    if (aqi <= 50) return {label: 'Good', color: '#00E400'};
    if (aqi <= 100) return {label: 'Moderate', color: '#FFFF00'};
    if (aqi <= 150) return {label: 'Unhealthy for Sensitive', color: '#FF7E00'};
    if (aqi <= 200) return {label: 'Unhealthy', color: '#FF0000'};
    if (aqi <= 300) return {label: 'Very Unhealthy', color: '#8F3F97'};
    return {label: 'Hazardous', color: '#7E0023'};
  };

  const getHumidityLevel = (humidity?: number): {label: string; color: string} => {
    if (humidity === undefined) return {label: 'Unknown', color: themeColors.textSecondary};
    if (humidity < 30) return {label: 'Dry', color: '#FFB84D'};
    if (humidity <= 60) return {label: 'Comfortable', color: '#00E400'};
    if (humidity <= 70) return {label: 'Humid', color: '#FFFF00'};
    return {label: 'Very Humid', color: '#FF7E00'};
  };

  const aqiLevel = getAQILevel(airQuality?.aqi);
  const humidityLevel = getHumidityLevel(humidity);

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.row}>
        {/* Humidity Card */}
        <View style={[styles.card, {backgroundColor: themeColors.surfaceVariant}]}>
          <View style={styles.cardHeader}>
            <Icon name="water-percent" size={18} color="#4A90E2" />
            <Text style={[styles.cardTitle, {color: themeColors.text}]}>Humidity</Text>
          </View>
          
          <View style={styles.valueContainer}>
            <Text style={[styles.mainValue, {color: themeColors.text}]}>
              {humidity !== undefined ? `${Math.round(humidity)}%` : '--'}
            </Text>
            <Text style={[styles.levelLabel, {color: humidityLevel.color}]}>
              {humidityLevel.label}
            </Text>
          </View>

          {humidity !== undefined && (
            <View style={styles.barContainer}>
              <View style={[styles.barBackground, {backgroundColor: themeColors.border}]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: humidityLevel.color,
                      width: `${humidity}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Air Quality Card */}
        <View style={[styles.card, {backgroundColor: themeColors.surfaceVariant}]}>
          <View style={styles.cardHeader}>
            <Icon name="air-filter" size={18} color={themeColors.textSecondary} />
            <Text style={[styles.cardTitle, {color: themeColors.text}]}>Air Quality</Text>
          </View>

          <View style={styles.valueContainer}>
            <Text style={[styles.mainValue, {color: themeColors.text}]}>
              {airQuality?.aqi !== undefined ? Math.round(airQuality.aqi) : '--'}
            </Text>
            <Text style={[styles.levelLabel, {color: aqiLevel.color}]}>
              {aqiLevel.label}
            </Text>
          </View>

          {airQuality?.pm25 !== undefined && (
            <View style={styles.detailsContainer}>
              <Text style={[styles.detailText, {color: themeColors.textSecondary}]}>
                PM2.5: {Math.round(airQuality.pm25)} μg/m³
              </Text>
            </View>
          )}
        </View>
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  mainValue: {
    fontSize: 32,
    fontWeight: '600',
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  barContainer: {
    marginTop: 8,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  detailText: {
    fontSize: 11,
  },
});
