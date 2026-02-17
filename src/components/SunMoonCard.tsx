import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Sun, Moon, MoonPhase} from '../types/weather';
import {colors} from '../theme/colors';
import {TimeFormat} from '../types/settings';
import {formatTime} from '../utils/timeFormat';

interface Props {
  sun?: Sun;
  moon?: Moon;
  timeFormat: TimeFormat;
  isDark: boolean;
}

export function SunMoonCard({sun, moon, timeFormat, isDark}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  const getMoonPhaseIcon = (phase?: MoonPhase): string => {
    switch (phase) {
      case MoonPhase.NEW_MOON:
        return 'moon-new';
      case MoonPhase.WAXING_CRESCENT:
        return 'moon-waxing-crescent';
      case MoonPhase.FIRST_QUARTER:
        return 'moon-first-quarter';
      case MoonPhase.WAXING_GIBBOUS:
        return 'moon-waxing-gibbous';
      case MoonPhase.FULL_MOON:
        return 'moon-full';
      case MoonPhase.WANING_GIBBOUS:
        return 'moon-waning-gibbous';
      case MoonPhase.THIRD_QUARTER:
        return 'moon-last-quarter';
      case MoonPhase.WANING_CRESCENT:
        return 'moon-waning-crescent';
      default:
        return 'moon-new';
    }
  };

  const getMoonPhaseName = (phase?: MoonPhase): string => {
    switch (phase) {
      case MoonPhase.NEW_MOON:
        return 'New moon';
      case MoonPhase.WAXING_CRESCENT:
        return 'Waxing crescent';
      case MoonPhase.FIRST_QUARTER:
        return 'First quarter';
      case MoonPhase.WAXING_GIBBOUS:
        return 'Waxing gibbous';
      case MoonPhase.FULL_MOON:
        return 'Full moon';
      case MoonPhase.WANING_GIBBOUS:
        return 'Waning gibbous';
      case MoonPhase.THIRD_QUARTER:
        return 'Third quarter';
      case MoonPhase.WANING_CRESCENT:
        return 'Waning crescent';
      default:
        return 'Unknown';
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.row}>
        {/* Sun Card */}
        <View style={[styles.card, {backgroundColor: themeColors.surfaceVariant}]}>
          <View style={styles.cardHeader}>
            <Icon name="white-balance-sunny" size={18} color="#FFA500" />
            <Text style={[styles.cardTitle, {color: themeColors.text}]}>Sun</Text>
          </View>
          
          <View style={styles.sunVisualization}>
            <View style={[styles.sunArc, {borderColor: themeColors.border}]}>
              <View style={[styles.sunPath, {backgroundColor: '#FFA500'}]} />
            </View>
          </View>

          <View style={styles.timesRow}>
            <Text style={[styles.timeText, {color: themeColors.textSecondary}]}>
              {formatTime(sun?.riseTime, timeFormat)}
            </Text>
            <Text style={[styles.timeText, {color: themeColors.textSecondary}]}>
              {formatTime(sun?.setTime, timeFormat)}
            </Text>
          </View>
        </View>

        {/* Moon Card */}
        <View style={[styles.card, {backgroundColor: themeColors.surfaceVariant}]}>
          <View style={styles.cardHeader}>
            <Icon name="moon-waning-crescent" size={18} color={themeColors.textSecondary} />
            <Text style={[styles.cardTitle, {color: themeColors.text}]}>Moon</Text>
          </View>

          <View style={styles.moonVisualization}>
            <Icon
              name={getMoonPhaseIcon(moon?.phase)}
              size={48}
              color={themeColors.text}
            />
          </View>

          <View style={styles.timesRow}>
            <Text style={[styles.timeText, {color: themeColors.textSecondary}]}>
              {formatTime(moon?.riseTime, timeFormat)}
            </Text>
            <Text style={[styles.timeText, {color: themeColors.textSecondary}]}>
              {formatTime(moon?.setTime, timeFormat)}
            </Text>
          </View>

          <Text style={[styles.phaseText, {color: themeColors.textSecondary}]}>
            {getMoonPhaseName(moon?.phase)}
          </Text>
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
    fontSize: 15,
    fontWeight: '600',
  },
  sunVisualization: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sunArc: {
    width: '80%',
    height: 40,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderWidth: 2,
    borderBottomWidth: 0,
    position: 'relative',
  },
  sunPath: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
    left: '50%',
    marginLeft: -4,
    marginTop: -4,
  },
  moonVisualization: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
  },
  phaseText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
