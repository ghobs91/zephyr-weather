import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {ColorTheme} from '../theme/colors';
import {t} from '../i18n';

interface Props {
  themeColors: ColorTheme;
  onAdd: () => void;
}

export function EmptyState({themeColors, onAdd}: Props) {
  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <Icon name="map-marker-plus" size={64} color={themeColors.textSecondary} />
      <Text style={[styles.text, {color: themeColors.text}]}>{t('empty.title')}</Text>
      <Text style={[styles.subtext, {color: themeColors.textSecondary}]}>
        {t('empty.subtitle')}
      </Text>
      <TouchableOpacity
        style={[styles.button, {backgroundColor: themeColors.primary}]}
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={t('empty.cta')}>
        <Text style={styles.buttonText}>{t('empty.cta')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40},
  text: {fontSize: 20, fontWeight: '600', marginTop: 16},
  subtext: {fontSize: 14, marginTop: 8, textAlign: 'center'},
  button: {marginTop: 24, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14},
  buttonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
