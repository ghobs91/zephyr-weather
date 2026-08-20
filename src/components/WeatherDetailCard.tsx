import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors} from '../theme/colors';
import {getInsetPanelStyle, withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  isDark: boolean;
}

export function WeatherDetailCard({
  title,
  value,
  subtitle,
  icon,
  isDark,
}: Props) {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <GlassSurface
      isDark={isDark}
      themeColors={themeColors}
      radius={22}
      blurAmount={18}
      style={[
        styles.container,
        getInsetPanelStyle(themeColors),
        {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.08 : 0.40)},
      ]}>
      <View style={styles.header}>
        <View style={[styles.iconChip, {backgroundColor: withAlpha(themeColors.primary, isDark ? 0.16 : 0.14)}]}>
          <Icon name={icon} size={18} color={themeColors.primary} />
        </View>
        <Text style={[styles.title, {color: themeColors.textSecondary}]}>
          {title}
        </Text>
      </View>
      
      <Text style={[styles.value, {color: themeColors.text}]}>{value}</Text>
      
      {subtitle && (
        <Text style={[styles.subtitle, {color: themeColors.textSecondary}]}>
          {subtitle}
        </Text>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 140,
    padding: 16,
  },
  header: {
    gap: 10,
    marginBottom: 8,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    fontSize: 28,
    fontWeight: '300',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
