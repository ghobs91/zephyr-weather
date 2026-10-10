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
import {getInsetPanelStyle} from '../theme/design';
import {useResponsiveLayout} from '../utils/platformDetect';
import {
  ThemeMode,
  TemperatureUnit,
  SpeedUnit,
  PressureUnit,
  PrecipitationUnit,
  DistanceUnit,
  TimeFormat,
  normalizeHomeCardOrder,
} from '../types/settings';
import {HOME_CARD_META} from '../utils/homeCards';
import {ALL_SOURCES} from '../services/weatherSources';
import {SourceFeature} from '../types/weather';
import appConfig from '../../app.json';

const APP_VERSION = appConfig.expo.version;

const SOURCE_FEATURE_LABELS: Record<SourceFeature, string> = {
  [SourceFeature.FORECAST]: 'Forecast',
  [SourceFeature.CURRENT]: 'Current',
  [SourceFeature.AIR_QUALITY]: 'Air Quality',
  [SourceFeature.POLLEN]: 'Pollen',
  [SourceFeature.MINUTELY]: 'Nowcast',
  [SourceFeature.ALERT]: 'Alerts',
  [SourceFeature.NORMALS]: 'Normals',
  [SourceFeature.LOCATION_SEARCH]: 'Search',
  [SourceFeature.REVERSE_GEOCODING]: 'Geocoding',
};

interface SettingsScreenProps {
  onClose?: () => void;
}

export function SettingsScreen({onClose}: SettingsScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  
  const {settings, updateSettings} = useWeatherStore();
  
  const {useDark, themeColors, backgroundKey} = useThemeColors();

  // Slightly darker card surface in dark mode so cards read as grouped
  // panels against the atmospheric background.
  const cardSurface = [
    getInsetPanelStyle(themeColors),
    useDark && styles.cardDarkSurface,
  ];

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
        cardSurface,
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
                  : themeColors.fill,
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

  const cardOrder = normalizeHomeCardOrder(settings.cardOrder);

  const moveCard = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= cardOrder.length) return;
    const next = [...cardOrder];
    [next[index], next[target]] = [next[target], next[index]];
    updateSettings({cardOrder: next});
  };

  return (
    <AtmosphericBackground isDark={useDark} backgroundKey={backgroundKey}>
      <View style={styles.container}>
      {onClose && (
        <View style={[styles.modalHeader, {paddingTop: insets.top + 8, backgroundColor: themeColors.glassHighlight, borderBottomColor: themeColors.separator}]}>
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

        {/* Home Screen Section */}
        {renderSectionHeader('Home Screen', 'view-dashboard-outline')}

        <View style={[styles.optionRow, cardSurface]}>
          <Text style={[styles.optionLabel, {color: themeColors.text}]}>Card Order</Text>
          <Text style={[styles.cardOrderHint, {color: themeColors.textSecondary}]}>
            Reorder the cards shown on the Weather screen.
          </Text>
          {cardOrder.map((id, index) => (
            <View
              key={id}
              style={[
                styles.cardOrderRow,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: themeColors.separator,
                },
              ]}>
              <Icon
                name={HOME_CARD_META[id].icon}
                size={18}
                color={themeColors.textSecondary}
              />
              <Text style={[styles.cardOrderLabel, {color: themeColors.text}]}>
                {HOME_CARD_META[id].label}
              </Text>
              <View style={styles.cardOrderButtons}>
                <TouchableOpacity
                  disabled={index === 0}
                  onPress={() => moveCard(index, -1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${HOME_CARD_META[id].label} up`}
                  style={styles.cardOrderButton}>
                  <Icon
                    name="chevron-up"
                    size={22}
                    color={
                      index === 0
                        ? themeColors.textTertiary
                        : themeColors.textSecondary
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={index === cardOrder.length - 1}
                  onPress={() => moveCard(index, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${HOME_CARD_META[id].label} down`}
                  style={styles.cardOrderButton}>
                  <Icon
                    name="chevron-down"
                    size={22}
                    color={
                      index === cardOrder.length - 1
                        ? themeColors.textTertiary
                        : themeColors.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

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
        
        {ALL_SOURCES.map(source => {
          return (
            <View
              key={source.id}
              style={[styles.sourceCard, cardSurface]}>
              <View style={styles.sourceHeader}>
                <View
                  style={[styles.sourceIcon, {backgroundColor: source.color}]}>
                  <Icon
                    name={source.tier === 'national' ? 'flag-variant' : 'earth'}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={[styles.sourceName, {color: themeColors.text}]}>
                    {source.name}
                  </Text>
                  <Text
                    style={[
                      styles.sourceDescription,
                      {color: themeColors.textSecondary},
                    ]}>
                    {source.tier === 'national'
                      ? 'National meteorological service'
                      : 'Augmenting global model'}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.sourceFeatures, {color: themeColors.textTertiary}]}>
                {source.features
                  .map(feature => SOURCE_FEATURE_LABELS[feature])
                  .join(' • ')}
              </Text>
            </View>
          );
        })}

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
        
        <View style={[styles.aboutCard, cardSurface]}>
          <Text style={[styles.appName, {color: themeColors.text}]}>
            Zephyr Weather
          </Text>
          <Text style={[styles.appVersion, {color: themeColors.textSecondary}]}>
            Version {APP_VERSION}
          </Text>
          <Text style={[styles.appDescription, {color: themeColors.textSecondary}]}>
            Privacy-first weather for iPhone, iPad, and Mac — live radar,
            next-hour rain, and native widgets, built on open data. No accounts,
            no ads, no tracking.
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
  cardDarkSurface: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
  cardOrderHint: {
    fontSize: 13,
    marginBottom: 4,
  },
  cardOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  cardOrderLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  cardOrderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardOrderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
