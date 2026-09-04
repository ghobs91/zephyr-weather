/**
 * English strings (default locale).
 *
 * Add a new locale by copying this file (e.g. `de.ts`) and registering
 * it in `src/i18n/index.ts`. Keys are flat (`namespace.name`) so `t()`
 * stays fully typed — a missing key is a compile error, not a blank UI.
 */
export const en = {
  'tabs.weather': 'Weather',
  'tabs.radar': 'Radar',
  'tabs.search': 'Search locations',

  'empty.title': 'No locations added',
  'empty.subtitle': 'Add a location to see weather data',
  'empty.cta': 'Add Location',

  'radar.layerRadar': 'Radar',
  'radar.layerSatellite': 'Satellite',
  'radar.play': 'Play radar animation',
  'radar.pause': 'Pause radar animation',

  'onboarding.step1Title': 'Know your sky',
  'onboarding.step1Body':
    'Hyperlocal forecasts, hourly out to 48 hours, and government radar — no accounts, no tracking.',
  'onboarding.step2Title': 'Official sources only',
  'onboarding.step2Body':
    'Forecasts from NOAA, MET Norway and peers. Radar from NEXRAD, ECCC and DWD. Satellite from NASA.',
  'onboarding.step3Title': 'Private by design',
  'onboarding.step3Body':
    'Your locations and settings stay on this device. Nothing is ever uploaded or sold.',
  'onboarding.next': 'Next',
  'onboarding.back': 'Back',
  'onboarding.skip': 'Skip',
  'onboarding.getStarted': 'Get Started',
  'onboarding.stepHint': 'Step {current} of {total}',
} as const;
