import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AirQuality} from '../types/weather';
import {colors, getAqiColor} from '../theme/colors';

interface Props {
  airQuality: AirQuality;
  isDark: boolean;
}

export function AirQualityCard({airQuality, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;
  const aqi = airQuality.aqi ?? 0;
  const aqiColor = getAqiColor(aqi, isDark);

  const getAqiLevel = (value: number): string => {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Fair';
    if (value <= 150) return 'Moderate';
    if (value <= 200) return 'Poor';
    if (value <= 300) return 'Very Poor';
    return 'Hazardous';
  };

  const pollutants = [
    {label: 'PM2.5', value: airQuality.pm25, unit: 'μg/m³'},
    {label: 'PM10', value: airQuality.pm10, unit: 'μg/m³'},
    {label: 'O₃', value: airQuality.o3, unit: 'μg/m³'},
    {label: 'NO₂', value: airQuality.no2, unit: 'μg/m³'},
    {label: 'SO₂', value: airQuality.so2, unit: 'μg/m³'},
    {label: 'CO', value: airQuality.co, unit: 'μg/m³'},
  ].filter(p => p.value !== undefined);

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.header}>
        <Icon name="blur" size={20} color={themeColors.textSecondary} />
        <Text style={[styles.title, {color: themeColors.text}]}>Air quality</Text>
      </View>

      <View style={styles.mainContent}>
        <View style={[styles.aqiCircle, {borderColor: aqiColor}]}>
          <Text style={[styles.aqiValue, {color: aqiColor}]}>{aqi}</Text>
          <Text style={[styles.aqiLabel, {color: themeColors.textSecondary}]}>
            {getAqiLevel(aqi)}
          </Text>
        </View>

        <View style={styles.pollutantsGrid}>
          {pollutants.map(pollutant => (
            <View key={pollutant.label} style={styles.pollutantItem}>
              <Text style={[styles.pollutantLabel, {color: themeColors.textSecondary}]}>
                {pollutant.label}
              </Text>
              <Text style={[styles.pollutantValue, {color: themeColors.text}]}>
                {pollutant.value?.toFixed(1)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* AQI Scale */}
      <View style={styles.scaleContainer}>
        <View style={styles.scale}>
          <View style={[styles.scaleSegment, {backgroundColor: themeColors.aqiGood}]} />
          <View style={[styles.scaleSegment, {backgroundColor: themeColors.aqiFair}]} />
          <View style={[styles.scaleSegment, {backgroundColor: themeColors.aqiModerate}]} />
          <View style={[styles.scaleSegment, {backgroundColor: themeColors.aqiPoor}]} />
          <View style={[styles.scaleSegment, {backgroundColor: themeColors.aqiVeryPoor}]} />
        </View>
        <View
          style={[
            styles.scaleIndicator,
            {left: `${Math.min(aqi / 3, 100)}%`, backgroundColor: aqiColor},
          ]}
        />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aqiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aqiValue: {
    fontSize: 28,
    fontWeight: '600',
  },
  aqiLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  pollutantsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pollutantItem: {
    width: '30%',
  },
  pollutantLabel: {
    fontSize: 11,
  },
  pollutantValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  scaleContainer: {
    marginTop: 16,
    position: 'relative',
  },
  scale: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scaleSegment: {
    flex: 1,
  },
  scaleIndicator: {
    position: 'absolute',
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
  },
});
