import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {RootStackParamList} from '../navigation/RootNavigator';
import {useWeatherStore} from '../store/weatherStore';
import {useThemeColors} from '../hooks/useThemeColors';
import {AtmosphericBackground} from '../components/AtmosphericBackground';
import {getCardStyle, withAlpha} from '../theme/design';
import {t} from '../i18n';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STEPS = [
  {icon: 'weather-partly-cloudy', titleKey: 'onboarding.step1Title', bodyKey: 'onboarding.step1Body'},
  {icon: 'radar', titleKey: 'onboarding.step2Title', bodyKey: 'onboarding.step2Body'},
  {icon: 'lock-outline', titleKey: 'onboarding.step3Title', bodyKey: 'onboarding.step3Body'},
] as const;

export function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const {useDark, themeColors} = useThemeColors();
  const setHasCompletedOnboarding = useWeatherStore(s => s.setHasCompletedOnboarding);

  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = () => {
    setHasCompletedOnboarding(true);
    navigation.replace('MainTabs');
  };

  return (
    <AtmosphericBackground isDark={useDark}>
      <View style={[styles.container, {paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24}]}>
        {!last && (
          <TouchableOpacity
            onPress={finish}
            style={styles.skip}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}>
            <Text style={[styles.skipText, {color: themeColors.textSecondary}]}>
              {t('onboarding.skip')}
            </Text>
          </TouchableOpacity>
        )}

        <View
          style={styles.card}
          accessible
          accessibilityLabel={t('onboarding.stepHint', {current: step + 1, total: STEPS.length})}>
          <View style={[styles.iconCircle, {backgroundColor: withAlpha(themeColors.primary, 0.14)}]}>
            <Icon name={current.icon} size={56} color={themeColors.primary} />
          </View>
          <Text style={[styles.title, {color: themeColors.text}]}>{t(current.titleKey)}</Text>
          <Text style={[styles.body, {color: themeColors.textSecondary}]}>{t(current.bodyKey)}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === step ? themeColors.primary : withAlpha(themeColors.textTertiary, 0.35),
                    width: i === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          {step > 0 ? (
            <TouchableOpacity
              onPress={() => setStep(s => s - 1)}
              style={[styles.secondaryButton, getCardStyle(themeColors)]}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.back')}>
              <Text style={[styles.secondaryText, {color: themeColors.text}]}>
                {t('onboarding.back')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
          <TouchableOpacity
            onPress={() => (last ? finish() : setStep(s => s + 1))}
            style={[styles.primaryButton, {backgroundColor: themeColors.primary}]}
            accessibilityRole="button"
            accessibilityLabel={last ? t('onboarding.getStarted') : t('onboarding.next')}>
            <Text style={styles.primaryText}>
              {last ? t('onboarding.getStarted') : t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AtmosphericBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
