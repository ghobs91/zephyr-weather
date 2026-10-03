import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from './ScaledText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Tides} from '../types/weather';
import {TimeFormat} from '../types/settings';
import {colors} from '../theme/colors';
import {getCardStyle, getInsetPanelStyle} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {formatTime} from '../utils/timeFormat';

interface Props {
  tides?: Tides;
  isDark: boolean;
  timeFormat: TimeFormat;
}

/**
 * NOAA CO-OPS high/low tide predictions for US coastal locations. Hidden
 * entirely when the location has no station within range.
 */
export function TideCard({tides, isDark, timeFormat}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  if (!tides || tides.predictions.length === 0) {
    return null;
  }

  const now = Date.now();
  const upcoming = tides.predictions.filter(
    (p) => p.time.getTime() >= now - 15 * 60 * 1000,
  );
  const events = (upcoming.length ? upcoming : tides.predictions).slice(0, 4);
  const unit = tides.units;

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      style={[styles.container, getCardStyle(themeColors)]}>
      <View style={styles.header}>
        <Icon name="waves" size={20} color={themeColors.textSecondary} />
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, {color: themeColors.textSecondary}]}>
            Coastal
          </Text>
          <Text style={[styles.title, {color: themeColors.text}]}>Tides</Text>
          {tides.stationName ? (
            <Text
              numberOfLines={1}
              style={[styles.station, {color: themeColors.textTertiary}]}>
              {tides.stationName}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rows}>
        {events.map((event, index) => {
          const isHigh = event.type === 'high';
          return (
            <View
              key={`${event.type}-${event.time.getTime()}-${index}`}
              style={[styles.row, getInsetPanelStyle(themeColors)]}>
              <Icon
                name={isHigh ? 'arrow-up' : 'arrow-down'}
                size={18}
                color={isHigh ? '#0EA5E9' : themeColors.textSecondary}
              />
              <Text style={[styles.rowLabel, {color: themeColors.text}]}>
                {isHigh ? 'High' : 'Low'}
              </Text>
              <Text
                style={[styles.rowTime, {color: themeColors.textSecondary}]}>
                {formatTime(event.time, timeFormat)}
              </Text>
              <Text style={[styles.rowValue, {color: themeColors.text}]}>
                {event.height.toFixed(1)} {unit}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.footer, {color: themeColors.textTertiary}]}>
        NOAA CO-OPS tide predictions
      </Text>
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
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
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
  station: {
    fontSize: 12,
    marginTop: 2,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowTime: {
    flex: 1,
    fontSize: 13,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 70,
    textAlign: 'right',
  },
  footer: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'right',
  },
});
