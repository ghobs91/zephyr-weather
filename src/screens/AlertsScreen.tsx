import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format} from 'date-fns';

import {useWeatherStore} from '../store/weatherStore';
import {colors} from '../theme/colors';
import {Alert, AlertSeverity} from '../types/weather';

export function AlertsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  
  const {locations, currentLocationIndex, settings} = useWeatherStore();
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;
  
  const currentLocation = locations[currentLocationIndex];
  const alerts = currentLocation?.weather?.alertList ?? [];

  const getSeverityColor = (severity?: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.EXTREME:
        return '#DC2626';
      case AlertSeverity.SEVERE:
        return '#EA580C';
      case AlertSeverity.MODERATE:
        return '#D97706';
      case AlertSeverity.MINOR:
        return '#CA8A04';
      default:
        return '#6B7280';
    }
  };

  const getSeverityLabel = (severity?: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.EXTREME:
        return 'Extreme';
      case AlertSeverity.SEVERE:
        return 'Severe';
      case AlertSeverity.MODERATE:
        return 'Moderate';
      case AlertSeverity.MINOR:
        return 'Minor';
      default:
        return 'Unknown';
    }
  };

  const getAlertIcon = (alert: Alert): string => {
    const title = alert.headline?.toLowerCase() ?? '';
    if (title.includes('heat')) return 'thermometer-alert';
    if (title.includes('cold') || title.includes('freeze') || title.includes('frost')) return 'snowflake-alert';
    if (title.includes('wind') || title.includes('gale')) return 'weather-windy';
    if (title.includes('thunder') || title.includes('storm')) return 'weather-lightning';
    if (title.includes('rain') || title.includes('flood')) return 'weather-pouring';
    if (title.includes('snow') || title.includes('ice') || title.includes('winter')) return 'weather-snowy-heavy';
    if (title.includes('fog')) return 'weather-fog';
    if (title.includes('fire')) return 'fire-alert';
    return 'alert-circle';
  };

  const renderAlert = (alert: Alert, index: number) => (
    <View
      key={index}
      style={[
        styles.alertCard,
        {
          backgroundColor: themeColors.cardBackground,
          borderLeftColor: getSeverityColor(alert.severity ?? undefined),
        },
      ]}>
      <View style={styles.alertHeader}>
        <View
          style={[
            styles.iconContainer,
            {backgroundColor: getSeverityColor(alert.severity ?? undefined) + '20'},
          ]}>
          <Icon
            name={getAlertIcon(alert)}
            size={24}
            color={getSeverityColor(alert.severity ?? undefined)}
          />
        </View>
        <View style={styles.alertHeaderText}>
          <Text style={[styles.alertTitle, {color: themeColors.text}]}>
            {alert.headline}
          </Text>
          <View style={styles.severityBadge}>
            <View
              style={[
                styles.severityDot,
                {backgroundColor: getSeverityColor(alert.severity ?? undefined)},
              ]}
            />
            <Text
              style={[
                styles.severityText,
                {color: getSeverityColor(alert.severity ?? undefined)},
              ]}>
              {getSeverityLabel(alert.severity ?? undefined)}
            </Text>
          </View>
        </View>
      </View>

      {alert.description && (
        <Text style={[styles.alertDescription, {color: themeColors.textSecondary}]}>
          {alert.description}
        </Text>
      )}

      <View style={styles.alertTimes}>
        {alert.startTime && (
          <View style={styles.timeRow}>
            <Icon name="clock-start" size={16} color={themeColors.textTertiary} />
            <Text style={[styles.timeText, {color: themeColors.textTertiary}]}>
              Starts: {format(alert.startTime, 'MMM d, HH:mm')}
            </Text>
          </View>
        )}
        {alert.endTime && (
          <View style={styles.timeRow}>
            <Icon name="clock-end" size={16} color={themeColors.textTertiary} />
            <Text style={[styles.timeText, {color: themeColors.textTertiary}]}>
              Ends: {format(alert.endTime, 'MMM d, HH:mm')}
            </Text>
          </View>
        )}
      </View>

      {alert.source && (
        <Text style={[styles.alertSource, {color: themeColors.textTertiary}]}>
          Source: {alert.source}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, {color: themeColors.text}]}>Weather Alerts</Text>
        </View>

        {alerts.length > 0 ? (
          <View style={styles.alertsList}>
            {alerts.map((alert, index) => renderAlert(alert, index))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="check-circle" size={64} color={themeColors.success} />
            <Text style={[styles.emptyTitle, {color: themeColors.text}]}>
              No Active Alerts
            </Text>
            <Text style={[styles.emptySubtitle, {color: themeColors.textSecondary}]}>
              There are no weather alerts for {currentLocation?.city ?? 'this location'}
            </Text>
          </View>
        )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  alertsList: {
    gap: 16,
  },
  alertCard: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertHeaderText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '500',
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  alertTimes: {
    marginTop: 12,
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
  },
  alertSource: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
