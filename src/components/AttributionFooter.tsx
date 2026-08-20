import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ColorTheme} from '../theme/colors';
import {withAlpha} from '../theme/design';

interface Props {
  themeColors: ColorTheme;
  isDark: boolean;
  sourceName: string;
  lastUpdated?: Date;
}

export function AttributionFooter({themeColors, isDark, sourceName, lastUpdated}: Props) {
  return (
    <View style={[styles.container, {backgroundColor: withAlpha(themeColors.surfaceElevated, isDark ? 0.05 : 0.48)}]}>
      <Text style={[styles.text, {color: themeColors.textTertiary}]}>
        {sourceName}
        {lastUpdated ? ` · Updated ${formatRelativeTime(lastUpdated)}` : ''}
      </Text>
    </View>
  );
}

function formatRelativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, marginTop: 12},
  text: {fontSize: 12},
});
