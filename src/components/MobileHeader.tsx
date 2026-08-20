import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Weather} from '../types/weather';
import {AppSettings} from '../types/settings';
import {ColorTheme} from '../theme/colors';
import {formatTime} from '../utils/timeFormat';

interface Props {
  weather?: Weather;
  themeColors: ColorTheme;
  settings: AppSettings;
}

export function MobileHeader({weather, themeColors, settings}: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, {color: themeColors.text}]}>Today</Text>
      {weather?.base?.refreshTime ? (
        <Text style={[styles.subtitle, {color: themeColors.textSecondary}]}>
          Updated {formatTime(new Date(weather.base.refreshTime), settings.timeFormat)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', marginBottom: 4},
  title: {fontSize: 32, fontWeight: '700'},
  subtitle: {fontSize: 14, marginTop: 4},
});
