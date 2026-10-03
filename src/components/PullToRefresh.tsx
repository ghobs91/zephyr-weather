import React, {useEffect, useRef, useState} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {ColorTheme} from '../theme/colors';
import {withAlpha} from '../theme/design';
import {GlassSurface} from './GlassSurface';
import {Text} from './ScaledText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Pull distance (px) that arms a refresh on release. */
const THRESHOLD = 72;
/** Visual clamp so a long drag doesn't stretch the indicator forever. */
const MAX_PULL = 130;
/** Resting offset from the viewport top while refreshing. */
const REST_Y = 8;
/** Hidden offset — fully above the viewport. */
const HIDDEN_Y = -58;
/** Keep the indicator on screen at least this long, even for instant refreshes. */
const MIN_VISIBLE_MS = 650;

const RING_SIZE = 26;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface Props {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  isDark: boolean;
  themeColors: ColorTheme;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Style for the outer wrapper (e.g. pager page width). */
  containerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
}

/**
 * Pull-to-refresh with a glass indicator that reports its own state.
 *
 * While dragging, a progress ring fills and the label flips to
 * "Release to refresh" once the threshold is crossed. While refreshing, the
 * ring spins continuously and the label reads "Updating…". The indicator is
 * absolutely positioned above the scroll content, so the ScrollView keeps its
 * native bounce behaviour.
 */
export function PullToRefresh({
  refreshing,
  onRefresh,
  children,
  isDark,
  themeColors,
  style,
  contentContainerStyle,
  containerStyle,
  showsVerticalScrollIndicator = false,
}: Props) {
  const pull = useSharedValue(0);
  const spin = useSharedValue(0);
  const [active, setActive] = useState(refreshing);
  const refreshingSV = useSharedValue(refreshing ? 1 : 0);
  const [armed, setArmed] = useState(false);
  const startedAtRef = useRef(0);

  // Keep the indicator visible for a beat even when the fetch resolves fast,
  // so the refresh state is actually readable.
  useEffect(() => {
    if (refreshing) {
      startedAtRef.current = Date.now();
      setActive(true);
      return;
    }
    if (!active) return;
    const remaining = MIN_VISIBLE_MS - (Date.now() - startedAtRef.current);
    if (remaining <= 0) {
      setActive(false);
      return;
    }
    const timer = setTimeout(() => setActive(false), remaining);
    return () => clearTimeout(timer);
  }, [refreshing, active]);

  useEffect(() => {
    refreshingSV.value = active ? 1 : 0;
    if (active) {
      setArmed(false);
      pull.value = withTiming(MAX_PULL, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(360, {duration: 1000, easing: Easing.linear}),
        -1,
        false,
      );
    } else {
      cancelAnimation(spin);
      spin.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
      pull.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [active, pull, spin, refreshingSV]);

  // Flag the threshold crossing on the JS thread so the label can change.
  useAnimatedReaction(
    () => refreshingSV.value === 0 && pull.value >= THRESHOLD,
    (isArmed, wasArmed) => {
      if (isArmed !== wasArmed) {
        runOnJS(setArmed)(isArmed);
      }
    },
  );

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        if (refreshingSV.value === 1) return;
        const distance = -event.contentOffset.y;
        pull.value =
          distance < 0 ? 0 : distance > MAX_PULL ? MAX_PULL : distance;
      },
      onEndDrag: () => {
        if (refreshingSV.value === 1) return;
        if (pull.value >= THRESHOLD) {
          runOnJS(onRefresh)();
        } else {
          pull.value = withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          });
        }
      },
    },
    [onRefresh],
  );

  const indicatorStyle = useAnimatedStyle(() => {
    const reveal =
      refreshingSV.value === 1 ? 1 : Math.min(1, pull.value / MAX_PULL);
    const progress = Math.min(1, pull.value / THRESHOLD);
    return {
      opacity: interpolate(pull.value, [0, 10], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            reveal,
            [0, 1],
            [HIDDEN_Y, REST_Y],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(progress, [0, 1], [0.65, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const ringProps = useAnimatedProps(() => {
    const progress = Math.min(1, pull.value / THRESHOLD);
    return {strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress)};
  });

  const iconStyle = useAnimatedStyle(() => {
    const degrees =
      refreshingSV.value === 1
        ? spin.value
        : interpolate(
            pull.value,
            [0, THRESHOLD],
            [0, 120],
            Extrapolation.CLAMP,
          );
    return {transform: [{rotate: `${degrees}deg`}]};
  });

  const label = active
    ? 'Updating…'
    : armed
      ? 'Release to refresh'
      : 'Pull to refresh';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Animated.View
        style={[styles.indicatorHost, indicatorStyle]}
        pointerEvents="none"
        accessibilityLiveRegion="polite">
        <GlassSurface
          isDark={isDark}
          themeColors={themeColors}
          radius={22}
          style={styles.pill}>
          <View style={styles.ringWrap}>
            <View style={styles.ringRotate}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={withAlpha(themeColors.textSecondary, 0.28)}
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={themeColors.primary}
                  strokeWidth={RING_STROKE}
                  strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                  strokeDashoffset={RING_CIRCUMFERENCE}
                  strokeLinecap="round"
                  fill="none"
                  animatedProps={ringProps}
                />
              </Svg>
            </View>
            <Animated.View style={[styles.iconOverlay, iconStyle]}>
              <Icon
                name="weather-partly-cloudy"
                size={13}
                color={themeColors.primary}
              />
            </Animated.View>
          </View>
          <Text style={[styles.label, {color: themeColors.textSecondary}]}>
            {label}
          </Text>
        </GlassSurface>
      </Animated.View>

      <Animated.ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces
        alwaysBounceVertical
        overScrollMode="always">
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {flex: 1},
  indicatorHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 15,
    paddingVertical: 9,
    minWidth: 172,
    borderRadius: 22,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringRotate: {
    transform: [{rotate: '-90deg'}],
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
