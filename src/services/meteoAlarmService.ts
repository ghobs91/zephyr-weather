/**
 * MeteoAlarm (EUMETNET) — official pan-European weather warnings.
 *
 * UNVERIFIED: this is an alerts-only source, not an ensemble forecast input.
 * Written against the OGC EDR warnings collection; confirm the auth header and
 * property names against a live response once METEOALARM_API_KEY is set.
 * https://api.meteoalarm.org/edr/v1/faq
 */
import axios from 'axios';
import {Alert, AlertSeverity} from '../types/weather';
import {apiKeys, hasApiKey} from '../config/apiKeys';

const METEOALARM_URL =
  'https://api.meteoalarm.org/edr/v1/collections/warnings/items';

interface MeteoAlarmFeature {
  id?: string;
  properties?: {
    event?: string;
    headline?: string;
    description?: string;
    severity?: string;
    onset?: string;
    expires?: string;
    areaDesc?: string;
  };
}

function mapSeverity(severity: string | undefined): AlertSeverity {
  switch ((severity ?? '').toLowerCase()) {
    case 'extreme':
      return AlertSeverity.EXTREME;
    case 'severe':
      return AlertSeverity.SEVERE;
    case 'moderate':
      return AlertSeverity.MODERATE;
    case 'minor':
      return AlertSeverity.MINOR;
    default:
      return AlertSeverity.UNKNOWN;
  }
}

/**
 * Fetches active warnings intersecting a small box around the coordinate.
 * Returns an empty array when the token is absent or the request fails.
 */
export async function fetchMeteoAlarmAlerts(
  latitude: number,
  longitude: number,
): Promise<Alert[]> {
  if (!hasApiKey('meteoAlarm')) return [];

  const span = 1;
  const bbox = [
    (longitude - span).toFixed(4),
    (latitude - span).toFixed(4),
    (longitude + span).toFixed(4),
    (latitude + span).toFixed(4),
  ].join(',');

  try {
    const response = await axios.get<{features?: MeteoAlarmFeature[]}>(
      METEOALARM_URL,
      {
        params: {bbox, limit: 50},
        headers: {Authorization: apiKeys.meteoAlarm},
      },
    );

    return (response.data?.features ?? [])
      .map((feature, index): Alert | null => {
        const props = feature.properties;
        const headline = props?.headline ?? props?.event;
        if (!headline) return null;
        return {
          id: feature.id ?? `meteoalarm-${index}`,
          headline,
          description: props?.description,
          severity: mapSeverity(props?.severity),
          startDate: props?.onset ? new Date(props.onset) : undefined,
          endDate: props?.expires ? new Date(props.expires) : undefined,
          source: 'MeteoAlarm',
        };
      })
      .filter((alert): alert is Alert => alert !== null);
  } catch {
    return [];
  }
}
