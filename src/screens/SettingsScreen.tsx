import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {useThemeColors} from '../hooks/useThemeColors';
import {isLiveActivitySupported} from '../utils/liveActivityManager';
import {AtmosphericBackground} from '../components/AtmosphericBackground';
import {getInsetPanelStyle, withAlpha} from '../theme/design';
import {useResponsiveLayout} from '../utils/platformDetect';
import {
  ThemeMode,
  TemperatureUnit,
  SpeedUnit,
  PressureUnit,
  PrecipitationUnit,
  DistanceUnit,
  TimeFormat,
} from '../types/settings';

interface SettingsScreenProps {
  onClose?: () => void;
}

export function SettingsScreen({onClose}: SettingsScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  
  const {settings, updateSettings} = useWeatherStore();
  
  const {useDark, themeColors} = useThemeColors();

  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} color={themeColors.primary} />
      <Text style={[styles.sectionTitle, {color: themeColors.textSecondary}]}>{title}</Text>
    </View>
  );

  const renderOptionRow = (
    label: string,
    value: string,
    options: {label: string; value: string}[],
    onSelect: (value: string) => void
  ) => (
    <View
      style={[
        styles.optionRow,
        getInsetPanelStyle(themeColors),
        {backgroundColor: withAlpha(themeColors.surfaceElevated, useDark ? 0.07 : 0.56)},
      ]}>
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
                  : withAlpha(themeColors.surfaceElevated, useDark ? 0.05 : 0.50),
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

  return (
    <AtmosphericBackground isDark={useDark}>
      <View style={styles.container}>
      {onClose && (
        <View style={[styles.modalHeader, {paddingTop: insets.top + 8, backgroundColor: withAlpha(themeColors.surface, 0.92), borderBottomColor: withAlpha(themeColors.cardBorder, 0.55)}]}>
          <Text style={[styles.modalTitle, {color: themeColors.text}]}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={themeColors.text} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={[
          styles.innerContent,
          {
            paddingTop: onClose ? 16 : insets.top + 16,
            paddingHorizontal: layout.contentPadding,
            maxWidth: layout.maxContentWidth,
            alignSelf: layout.maxContentWidth ? 'center' : undefined,
            width: layout.maxContentWidth ? '100%' : undefined,
          },
        ]}>
        {!onClose && (
          <View style={styles.heroHeader}>
            <Text style={[styles.title, {color: themeColors.text}]}>Settings</Text>
            <Text style={[styles.heroSubtitle, {color: themeColors.textSecondary}]}>Tune theme, units, alerts, and data sources.</Text>
          </View>
        )}

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

        {renderOptionRow(
          'Time Format',
          settings.timeFormat,
          [
            {label: 'Auto', value: 'auto'},
            {label: '12h', value: '12h'},
            {label: '24h', value: '24h'},
          ],
          (value) => updateSettings({timeFormat: value as TimeFormat})
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

        {/* Weather Sources Section */}
        {renderSectionHeader('Weather Sources', 'cloud-outline')}
        
        <View style={[styles.sourceCard, getInsetPanelStyle(themeColors), {backgroundColor: withAlpha(themeColors.surfaceElevated, useDark ? 0.07 : 0.56)}]}>
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

        <View style={[styles.sourceCard, getInsetPanelStyle(themeColors), {backgroundColor: withAlpha(themeColors.surfaceElevated, useDark ? 0.07 : 0.56)}]}>
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

        {/* Lock Screen Section (Live Activities need iOS 16.2+) */}
        {isLiveActivitySupported() && (
          <>
            {renderSectionHeader('Lock Screen', 'lock-outline')}

            {renderOptionRow(
              'Live Activity',
              settings.liveActivityEnabled ? 'on' : 'off',
              [
                {label: 'On', value: 'on'},
                {label: 'Off', value: 'off'},
              ],
              (value) => updateSettings({liveActivityEnabled: value === 'on'})
            )}
          </>
        )}

        {/* About Section */}
        {renderSectionHeader('About', 'information-outline')}
        
        <View style={[styles.aboutCard, getInsetPanelStyle(themeColors), {backgroundColor: withAlpha(themeColors.surfaceElevated, useDark ? 0.07 : 0.56)}]}>
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
        </View>
      </ScrollView>
      </View>
    </AtmosphericBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContent: {
    paddingBottom: 16,
  },
  heroHeader: {
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  optionRow: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
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
    paddingVertical: 10,
    borderRadius: 999,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sourceCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
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
    borderRadius: 24,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});
