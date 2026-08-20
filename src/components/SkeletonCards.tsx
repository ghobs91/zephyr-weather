import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import {ColorTheme} from '../theme/colors';
import {withAlpha} from '../theme/design';

interface Props {
  themeColors: ColorTheme;
  isDark: boolean;
  /** Number of skeleton cards to render */
  count?: number;
}

/**
 * Shimmer/skeleton loading placeholder that renders animated pulsing cards
 * while weather data is being fetched.
 */
export function SkeletonCards({themeColors, isDark, count = 3}: Props) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const bgColor = withAlpha(themeColors.surfaceElevated, isDark ? 0.06 : 0.40);

  return (
    <View style={styles.container}>
      {Array.from({length: count}).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.card,
            {backgroundColor: bgColor, opacity: shimmerOpacity},
          ]}>
          <View style={[styles.line, styles.lineShort, {backgroundColor: themeColors.textTertiary}]} />
          <View style={[styles.line, styles.lineLong, {backgroundColor: themeColors.textTertiary}]} />
          <View style={[styles.line, styles.lineMedium, {backgroundColor: themeColors.textTertiary}]} />
          <View style={[styles.line, styles.lineFull, {backgroundColor: themeColors.textSecondary}]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: 12, padding: 8},
  card: {borderRadius: 24, padding: 20, gap: 12},
  line: {borderRadius: 8, height: 14},
  lineShort: {width: '40%'},
  lineMedium: {width: '60%'},
  lineLong: {width: '80%'},
  lineFull: {width: '100%'},
});
