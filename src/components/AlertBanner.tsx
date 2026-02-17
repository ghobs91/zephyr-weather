import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {format} from 'date-fns';
import {Alert, AlertSeverity} from '../types/weather';
import {colors} from '../theme/colors';

interface Props {
  alerts: Alert[];
  onPress?: () => void;
  isDark: boolean;
}

export function AlertBanner({alerts, onPress, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  if (alerts.length === 0) return null;

  // Get the most severe alert
  const severityOrder: AlertSeverity[] = [
    AlertSeverity.EXTREME,
    AlertSeverity.SEVERE,
    AlertSeverity.MODERATE,
    AlertSeverity.MINOR,
    AlertSeverity.UNKNOWN,
  ];

  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );
  
  const primaryAlert = sortedAlerts[0];

  const getSeverityColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.EXTREME:
        return themeColors.alertExtreme;
      case AlertSeverity.SEVERE:
        return themeColors.alertSevere;
      case AlertSeverity.MODERATE:
        return themeColors.alertModerate;
      case AlertSeverity.MINOR:
        return themeColors.alertMinor;
      default:
        return themeColors.warning;
    }
  };

  const getSeverityIcon = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.EXTREME:
        return 'alert-octagon';
      case AlertSeverity.SEVERE:
        return 'alert';
      case AlertSeverity.MODERATE:
        return 'alert-circle';
      case AlertSeverity.MINOR:
        return 'information';
      default:
        return 'alert-circle-outline';
    }
  };

  const bannerColor = primaryAlert.color || getSeverityColor(primaryAlert.severity);

  return (
    <TouchableOpacity
      style={[styles.container, {backgroundColor: bannerColor}]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Icon
        name={getSeverityIcon(primaryAlert.severity)}
        size={24}
        color="#FFFFFF"
      />
      
      <View style={styles.content}>
        <Text style={styles.headline} numberOfLines={1}>
          {primaryAlert.headline || 'Weather Alert'}
        </Text>
        
        {primaryAlert.startDate && primaryAlert.endDate && (
          <Text style={styles.timeRange}>
            {format(primaryAlert.startDate, 'MMM d, HH:mm')} — {format(primaryAlert.endDate, 'MMM d, HH:mm')}
          </Text>
        )}
      </View>

      {alerts.length > 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{alerts.length - 1}</Text>
        </View>
      )}

      <Icon name="chevron-right" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  timeRange: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
