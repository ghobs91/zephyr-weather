import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors} from '../theme/colors';

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
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.header}>
        <Icon name={icon} size={18} color={themeColors.textSecondary} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
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
  },
});
