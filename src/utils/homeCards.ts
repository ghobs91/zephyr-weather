import {HomeCardId} from '../types/settings';

/** Display metadata for the reorderable home-screen cards. */
export const HOME_CARD_META: Record<HomeCardId, {label: string; icon: string}> =
  {
    current: {label: 'Current Weather', icon: 'weather-partly-cloudy'},
    hourly: {label: 'Hourly Forecast', icon: 'clock-outline'},
    daily: {label: 'Daily Forecast', icon: 'calendar'},
    details: {label: 'Weather Details', icon: 'thermometer'},
    sunmoon: {label: 'Sun & Moon', icon: 'weather-sunset'},
    pollen: {label: 'Pollen', icon: 'flower'},
    tides: {label: 'Tides', icon: 'waves'},
    aurora: {label: 'Aurora', icon: 'weather-night'},
  };
