import {useState, useEffect, useCallback, useRef} from 'react';
import {AppState} from 'react-native';
import {useWeatherStore} from '../store/weatherStore';
import {fetchPreferredWeather} from '../services/preferredWeatherService';
import {cacheWeatherData, getCachedWeatherData} from '../services/weatherCache';
import {Location, Weather} from '../types/weather';

/**
 * Encapsulates all weather data fetching and refresh lifecycle:
 * - Shows cached data immediately while fetching fresh data
 * - Pull-to-refresh state
 * - Initial fetch when location has no cached weather
 * - Re-fetch on app foreground
 * - Periodic refresh (15 min interval)
 * - Caches results for offline resilience
 */
export function useWeatherRefresh(location: Location | undefined) {
  const {updateLocationWeather, setLoading, setError} = useWeatherStore();
  const [refreshing, setRefreshing] = useState(false);
  const locationRef = useRef(location);
  locationRef.current = location;

  const refreshWeather = useCallback(async () => {
    const loc = locationRef.current;
    if (!loc) return;
    try {
      setLoading(true);

      // Try to show cached data immediately for perceived speed
      const cached = await getCachedWeatherData(loc.latitude, loc.longitude);
      if (cached && !loc.weather) {
        // Only apply cache if we don't already have weather data
        updateLocationWeather(loc.id, cached);
      }

      // Fetch fresh data from network
      const {latitude, longitude, timezone} = loc;
      const weather = await fetchPreferredWeather(latitude, longitude, timezone);
      updateLocationWeather(loc.id, weather);

      // Cache for offline use
      cacheWeatherData(latitude, longitude, weather).catch(err =>
        console.error('Failed to cache weather:', err),
      );
    } catch (error) {
      // If we showed cached data, don't overwrite with an error
      if (!loc.weather) {
        setError('Failed to fetch weather data');
      }
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setLoading, updateLocationWeather, setError]);

  // Initial fetch when location has no cached weather
  useEffect(() => {
    if (location && !location.weather) {
      refreshWeather();
    }
  }, [location, refreshWeather]);

  // Re-fetch when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && locationRef.current) {
        refreshWeather();
      }
    });
    return () => subscription.remove();
  }, [refreshWeather]);

  // Periodic refresh every 15 minutes
  useEffect(() => {
    if (!location) return;
    const interval = setInterval(() => {
      refreshWeather();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location, refreshWeather]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshWeather();
  }, [refreshWeather]);

  return {refreshing, onRefresh, refreshWeather};
}
