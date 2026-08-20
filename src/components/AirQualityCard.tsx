import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AirQuality} from '../types/weather';
import {colors, getAqiColor} from '../theme/colors';
import {getCardStyle, getInsetPanelStyle, withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';

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
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="blur" size={20} color={themeColors.textSecondary} />
        <View>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>Conditions</Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Air quality</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View
          style={[
            styles.aqiCircle,
            {borderColor: aqiColor, backgroundColor: withAlpha(aqiColor, isDark ? 0.12 : 0.10)},
          ]}>
          <Text style={[styles.aqiValue, {color: aqiColor}]}>{aqi}</Text>
          <Text style={[styles.aqiLabel, {color: themeColors.textSecondary}]}>
            {getAqiLevel(aqi)}
          </Text>
        </View>

        <View style={styles.pollutantsGrid}>
          {pollutants.map(pollutant => (
            <View
              key={pollutant.label}
              style={[
                styles.pollutantItem,
                getInsetPanelStyle(themeColors),
                {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.06 : 0.54)},
              ]}>
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
            // Cap at 97% so the 10px-wide indicator dot stays fully visible
            // (it has marginLeft: -5, so at 100% it would overflow the right edge)
            {left: `${Math.min(aqi / 3, 97)}%`, backgroundColor: aqiColor},
          ]}
        />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
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
    fontSize: 11,
    marginTop: 2,
  },
  pollutantsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pollutantItem: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
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
    height: 8,
    borderRadius: 999,
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
