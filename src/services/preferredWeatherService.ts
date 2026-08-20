import {fetchWeather, fetchAirQuality, fetchMinutelyPrecipitation} from './openMeteoService';
import {fetchNWSWeather, isUSLocation} from './nwsService';
import {fetchMetNoWeather} from './metnoService';
import {combineEnsemble, EnsembleSource} from './ensembleService';
import {Weather} from '../types/weather';

/**
 * Fetches weather from multiple sources in parallel and combines them
 * using ensemble merging for better accuracy and confidence metrics.
 *
 * Sources used:
 *  - Open-Meteo: always (global, has air quality, pollen, minutely rain)
 *  - Met.no: always (global, ECMWF-backed)
 *  - NWS: US only (highest detail for US locations)
 */
export async function fetchPreferredWeather(
  latitude: number,
  longitude: number,
  timezone: string,
): Promise<Weather> {
  const sources: EnsembleSource[] = [];
  let isUS = false;

  // Check NWS coverage asynchronously (non-blocking for the other fetches)
  const usPromise = isUSLocation(latitude, longitude)
    .then(result => { isUS = result; })
    .catch(err => { console.warn('NWS coverage check failed:', err); });

  // Fire all available sources in parallel
  const fetchers: Promise<{name: string; weather: Weather | null}>[] = [
    // Open-Meteo — always available, provides air quality, pollen, minutely
    fetchWeather(latitude, longitude, timezone)
      .then(w => ({name: 'Open-Meteo', weather: w}))
      .catch(err => {
        console.warn('Open-Meteo fetch failed:', err);
        return {name: 'Open-Meteo', weather: null};
      }),

    // Met.no — global ECMWF model
    fetchMetNoWeather(latitude, longitude, timezone)
      .then(w => ({name: 'Met.no', weather: w}))
      .catch(err => {
        console.warn('Met.no fetch failed:', err);
        return {name: 'Met.no', weather: null};
      }),
  ];

  // Wait for NWS coverage check before deciding whether to include it
  await usPromise;

  if (isUS) {
    fetchers.push(
      fetchNWSWeather(latitude, longitude)
        .then(async w => {
          // Enrich NWS with air quality from Open-Meteo
          const airQuality = await fetchAirQuality(latitude, longitude, timezone).catch(
            () => null,
          );
          if (w.current && airQuality) {
            w.current.airQuality = airQuality;
          }
          return {name: 'NWS', weather: w};
        })
        .catch(err => {
          console.warn('NWS fetch failed:', err);
          return {name: 'NWS', weather: null};
        }),
    );
  }

  // Add minutely precipitation as a pseudo-source (contributes only minutely data)
  fetchers.push(
    fetchMinutelyPrecipitation(latitude, longitude)
      .then(minutely => ({
        name: 'Open-Meteo-Minutely',
        weather: minutely.length > 0
          ? {dailyForecast: [], hourlyForecast: [], minutelyForecast: minutely}
          : null,
      }))
      .catch(err => {
        console.warn('Minutely precipitation fetch failed:', err);
        return {name: 'Open-Meteo-Minutely', weather: null};
      }),
  );

  // Collect successful results
  const results = await Promise.all(fetchers);
  for (const result of results) {
    if (result.weather) {
      sources.push(result as EnsembleSource);
    }
  }

  // If nothing succeeded, fall back to single-source Open-Meteo
  if (sources.length === 0) {
    console.warn('All weather sources failed, attempting final fallback');
    const fallback = await fetchWeather(latitude, longitude, timezone);
    return fallback;
  }

  // Combine all successful sources into ensemble forecast
  return combineEnsemble(sources);
}
