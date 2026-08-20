import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {ColorTheme} from '../theme/colors';
import {Location, Weather} from '../types/weather';
import {AppSettings} from '../types/settings';
import {formatTime} from '../utils/timeFormat';

interface Props {
  location: Location;
  weather?: Weather;
  themeColors: ColorTheme;
  settings: AppSettings;
}

export function DesktopHeader({location, weather, themeColors, settings}: Props) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={[styles.locationName, {color: themeColors.text}]}>
          {location.city || 'Unknown Location'}
        </Text>
        {location.isCurrentPosition && (
          <View style={styles.homeBadge}>
            <Icon name="map-marker" size={12} color={themeColors.textSecondary} />
            <Text style={[styles.homeBadgeText, {color: themeColors.textSecondary}]}>
              Current Location
            </Text>
          </View>
        )}
      </View>
      {weather?.base?.refreshTime && (
        <Text style={[styles.updateTime, {color: themeColors.textSecondary}]}>
          Updated {formatTime(new Date(weather.base.refreshTime), settings.timeFormat)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  locationName: {fontSize: 28, fontWeight: '700', marginBottom: 4},
  homeBadge: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  homeBadgeText: {fontSize: 13, fontWeight: '500'},
  updateTime: {fontSize: 13},
});
