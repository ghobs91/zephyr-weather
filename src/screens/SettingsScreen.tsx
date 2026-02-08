import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  useColorScheme,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {colors} from '../theme/colors';
import {
  ThemeMode,
  TemperatureUnit,
  SpeedUnit,
  PressureUnit,
  PrecipitationUnit,
  DistanceUnit,
} from '../types/settings';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  
  const {settings, updateSettings} = useWeatherStore();
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;

  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} color={themeColors.primary} />
      <Text style={[styles.sectionTitle, {color: themeColors.text}]}>{title}</Text>
    </View>
  );

  const renderOptionRow = (
    label: string,
    value: string,
    options: {label: string; value: string}[],
    onSelect: (value: string) => void
  ) => (
    <View style={[styles.optionRow, {backgroundColor: themeColors.cardBackground}]}>
      <Text style={[styles.optionLabel, {color: themeColors.text}]}>{label}</Text>
      <View style={styles.optionButtons}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              {
                backgroundColor: value === option.value
                  ? themeColors.primary
                  : themeColors.surfaceVariant,
              },
            ]}
            onPress={() => onSelect(option.value)}>
            <Text
              style={[
                styles.optionButtonText,
                {color: value === option.value ? '#FFFFFF' : themeColors.textSecondary},
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSwitchRow = (
    label: string,
    subtitle: string,
    value: boolean,
    onToggle: (value: boolean) => void
  ) => (
    <View style={[styles.switchRow, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.switchContent}>
        <Text style={[styles.switchLabel, {color: themeColors.text}]}>{label}</Text>
        <Text style={[styles.switchSubtitle, {color: themeColors.textSecondary}]}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{false: themeColors.surfaceVariant, true: themeColors.primary}}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
        <Text style={[styles.title, {color: themeColors.text}]}>Settings</Text>

        {/* Appearance Section */}
        {renderSectionHeader('Appearance', 'palette')}
        
        {renderOptionRow(
          'Theme',
          settings.theme,
          [
            {label: 'System', value: 'system'},
            {label: 'Light', value: 'light'},
            {label: 'Dark', value: 'dark'},
          ],
          (value) => updateSettings({theme: value as ThemeMode})
        )}

        {/* Units Section */}
        {renderSectionHeader('Units', 'ruler')}
        
        {renderOptionRow(
          'Temperature',
          settings.temperatureUnit,
          [
            {label: '°C', value: 'celsius'},
            {label: '°F', value: 'fahrenheit'},
          ],
          (value) => updateSettings({temperatureUnit: value as TemperatureUnit})
        )}

        {renderOptionRow(
          'Wind Speed',
          settings.speedUnit,
          [
            {label: 'km/h', value: 'kmh'},
            {label: 'mph', value: 'mph'},
            {label: 'm/s', value: 'ms'},
            {label: 'kn', value: 'kn'},
          ],
          (value) => updateSettings({speedUnit: value as SpeedUnit})
        )}

        {renderOptionRow(
          'Pressure',
          settings.pressureUnit,
          [
            {label: 'hPa', value: 'hpa'},
            {label: 'inHg', value: 'inhg'},
            {label: 'mmHg', value: 'mmhg'},
          ],
          (value) => updateSettings({pressureUnit: value as PressureUnit})
        )}

        {renderOptionRow(
          'Precipitation',
          settings.precipitationUnit,
          [
            {label: 'mm', value: 'mm'},
            {label: 'in', value: 'inch'},
          ],
          (value) => updateSettings({precipitationUnit: value as PrecipitationUnit})
        )}

        {renderOptionRow(
          'Distance',
          settings.distanceUnit,
          [
            {label: 'km', value: 'km'},
            {label: 'mi', value: 'mi'},
          ],
          (value) => updateSettings({distanceUnit: value as DistanceUnit})
        )}

        {/* Notifications Section */}
        {renderSectionHeader('Notifications', 'bell-outline')}
        
        {renderSwitchRow(
          'Weather Alerts',
          'Get notified about severe weather',
          settings.alertNotifications,
          (value) => updateSettings({alertNotifications: value})
        )}

        {renderSwitchRow(
          'Precipitation',
          'Notifications about rain or snow',
          settings.precipitationNotifications,
          (value) => updateSettings({precipitationNotifications: value})
        )}

        {renderSwitchRow(
          'Today\'s Forecast',
          'Daily morning forecast notification',
          settings.todayForecastNotifications,
          (value) => updateSettings({todayForecastNotifications: value})
        )}

        {renderSwitchRow(
          'Tomorrow\'s Forecast',
          'Evening forecast for tomorrow',
          settings.tomorrowForecastNotifications,
          (value) => updateSettings({tomorrowForecastNotifications: value})
        )}

        {/* Weather Sources Section */}
        {renderSectionHeader('Weather Sources', 'cloud-outline')}
        
        <View style={[styles.sourceCard, {backgroundColor: themeColors.cardBackground}]}>
          <View style={styles.sourceHeader}>
            <View style={[styles.sourceIcon, {backgroundColor: '#1E40AF'}]}>
              <Icon name="flag-variant" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceName, {color: themeColors.text}]}>
                NOAA National Weather Service
              </Text>
              <Text style={[styles.sourceDescription, {color: themeColors.textSecondary}]}>
                Official US weather forecasts and alerts
              </Text>
            </View>
          </View>
          <Text style={[styles.sourceFeatures, {color: themeColors.textTertiary}]}>
            US Only • Forecast • Alerts • Hourly
          </Text>
        </View>

        <View style={[styles.sourceCard, {backgroundColor: themeColors.cardBackground}]}>
          <View style={styles.sourceHeader}>
            <View style={[styles.sourceIcon, {backgroundColor: '#FF6B35'}]}>
              <Icon name="weather-partly-cloudy" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceName, {color: themeColors.text}]}>
                Open-Meteo
              </Text>
              <Text style={[styles.sourceDescription, {color: themeColors.textSecondary}]}>
                Free, open source weather API
              </Text>
            </View>
          </View>
          <Text style={[styles.sourceFeatures, {color: themeColors.textTertiary}]}>
            Global • Forecast • Current • Air Quality • Pollen • Search
          </Text>
        </View>

        {/* About Section */}
        {renderSectionHeader('About', 'information-outline')}
        
        <View style={[styles.aboutCard, {backgroundColor: themeColors.cardBackground}]}>
          <Text style={[styles.appName, {color: themeColors.text}]}>
            Zephyr Weather
          </Text>
          <Text style={[styles.appVersion, {color: themeColors.textSecondary}]}>
            Version 1.0.0
          </Text>
          <Text style={[styles.appDescription, {color: themeColors.textSecondary}]}>
            A beautiful weather app inspired by Breezy Weather, built with React Native.
          </Text>
          <Text style={[styles.attribution, {color: themeColors.textTertiary}]}>
            Weather data provided by NOAA NWS (US) and Open-Meteo (Global)
          </Text>
        </View>

        <View style={{height: insets.bottom + 24}} />
      </ScrollView>
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
  content: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionRow: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  switchContent: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  switchSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sourceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sourceDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  sourceFeatures: {
    fontSize: 12,
    marginTop: 4,
  },
  aboutCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
  },
  appVersion: {
    fontSize: 14,
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  attribution: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});
