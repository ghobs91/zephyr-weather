import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {Pollen} from '../types/weather';

interface PollenCardProps {
  pollen?: Pollen;
  themeColors: any;
}

export function PollenCard({pollen, themeColors}: PollenCardProps) {
  if (!pollen) return null;

  const getPollenLevel = (value?: number): {label: string; color: string} => {
    if (value === undefined) return {label: 'Unknown', color: themeColors.textSecondary};
    if (value <= 1) return {label: 'Very Low', color: '#22C55E'};
    if (value <= 2) return {label: 'Low', color: '#84CC16'};
    if (value <= 3) return {label: 'Moderate', color: '#EAB308'};
    if (value <= 4) return {label: 'High', color: '#F97316'};
    return {label: 'Very High', color: '#EF4444'};
  };

  const renderPollenItem = (
    label: string,
    value: number | undefined,
    icon: string,
    iconColor: string
  ) => {
    if (value === undefined) return null;
    const level = getPollenLevel(value);
    
    return (
      <View style={[styles.pollenItem, {backgroundColor: themeColors.surfaceVariant}]}>
        <View style={styles.pollenHeader}>
          <View style={[styles.pollenDot, {backgroundColor: iconColor}]} />
          <Text style={[styles.pollenLabel, {color: themeColors.text}]}>{label}</Text>
        </View>
        <Text style={[styles.pollenLevel, {color: level.color}]}>{level.label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.cardBackground}]}>
      <View style={styles.header}>
        <Icon name="flower-pollen" size={20} color={themeColors.primary} />
        <Text style={[styles.title, {color: themeColors.text}]}>Pollen</Text>
      </View>

      <View style={styles.pollenGrid}>
        {renderPollenItem('Grass', pollen.grass?.index, 'grass', '#22C55E')}
        {renderPollenItem('Tree', pollen.tree?.index, 'tree', '#16A34A')}
        {renderPollenItem('Ragweed', pollen.ragweed?.index, 'flower', '#EAB308')}
        {renderPollenItem('Mold', pollen.mold?.index, 'bacteria', '#8B5CF6')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  pollenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pollenItem: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
  },
  pollenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pollenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pollenLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  pollenLevel: {
    fontSize: 13,
    marginTop: 2,
  },
});
