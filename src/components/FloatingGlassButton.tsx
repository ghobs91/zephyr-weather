import React from 'react';
import {StyleProp, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {ColorTheme} from '../theme/colors';
import {getShadow} from '../theme/design';
import {GlassSurface} from './GlassSurface';

interface Props {
  icon: string;
  onPress: () => void;
  themeColors: ColorTheme;
  isDark: boolean;
  accessibilityLabel: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Circular liquid-glass button used for the floating home/radar controls. */
export function FloatingGlassButton({
  icon,
  onPress,
  themeColors,
  isDark,
  accessibilityLabel,
  size = 52,
  style,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={style}>
      <GlassSurface
        isDark={isDark}
        themeColors={themeColors}
        variant="thin"
        radius={size / 2}
        style={[
          styles.button,
          {width: size, height: size},
          getShadow(themeColors, 'float'),
        ]}>
        <Icon name={icon} size={size * 0.46} color={themeColors.text} />
      </GlassSurface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {justifyContent: 'center', alignItems: 'center'},
});
