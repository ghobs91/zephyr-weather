/**
 * Government-only radar providers.
 *
 * Policy: radar imagery comes exclusively from official national
 * meteorological services — no third-party aggregators.
 *
 *  - US (+ territories): NOAA NEXRAD via `nexradService.ts`
 *    (S3 scan listing + ImageServer rendering, station-based animation).
 *  - Canada: ECCC MSC GeoMet WMS, North American 1km composite
 *    (RADAR_1KM_RRAI rain / RADAR_1KM_RSNO snow). This composite
 *    ingests ~180 CA + US radars, Open Government Licence — Canada.
 *    Docs: https://eccc-msc.github.io/open-data/msc-data/obs_radar/readme_radar_geomet_en/
 *  - Central Europe: DWD Geoserver WMS, `dwd:Niederschlagsradar`
 *    (RV reflectivity composite, 1km, 5-min incl. 0–2h nowcast).
 *    Docs: https://www.dwd.de/DE/leistungen/radarprodukte/radarlayer.html
 *  - Rest of Europe: EUMETNET OPERA pan-European composite exists
 *    (CIRRUS 1km/5-min reflectivity, NIMBUS rain-rate) but is served
 *    as ODIM HDF5 / Cloud-Optimised GeoTIFF via the ORD S3 API —
 *    no gov-run tile renderer. Documented follow-up, not wired here.
 *    See https://eumetnet.github.io/openradardata-documentation/
 */

export type RadarProviderId = 'nexrad' | 'eccc' | 'dwd';

export interface RadarProvider {
  id: RadarProviderId;
  /** Short tag shown in the UI, e.g. "NEXRAD", "ECCC", "DWD". */
  label: string;
  kind: 'scan' | 'wms';
  attribution: string;
}

export const RADAR_PROVIDERS: Record<RadarProviderId, RadarProvider> = {
  nexrad: {
    id: 'nexrad',
    label: 'NEXRAD',
    kind: 'scan',
    attribution: 'NOAA NEXRAD via AWS · © OpenStreetMap · CARTO',
  },
  eccc: {
    id: 'eccc',
    label: 'ECCC',
    kind: 'wms',
    attribution: 'ECCC GeoMet · © OpenStreetMap · CARTO',
  },
  dwd: {
    id: 'dwd',
    label: 'DWD',
    kind: 'wms',
    attribution: 'DWD Geoserver · © OpenStreetMap · CARTO',
  },
};

// DWD RV composite footprint: ~1100×1200 km over Germany + surroundings.
const DWD_BBOX = {west: 2, south: 46, east: 18, north: 56.5};

// ECCC North American composite domain (generous bounds).
const NA_BBOX = {west: -180, south: 15, east: -40, north: 72};

function inBbox(
  lat: number,
  lon: number,
  box: {west: number; south: number; east: number; north: number},
): boolean {
  return lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east;
}

/**
 * Pick the government radar provider for a coordinate.
 * Returns null where no gov tile source is wired yet (most of the
 * world outside North America + DWD footprint) — callers should
 * render an honest empty state, not a third-party fallback.
 */
export function selectRadarProvider(
  lat: number,
  lon: number,
  countryCode?: string,
): RadarProvider | null {
  if (inBbox(lat, lon, DWD_BBOX)) {
    return RADAR_PROVIDERS.dwd;
  }
  if (countryCode === 'CA' || (lat >= 49 && inBbox(lat, lon, NA_BBOX))) {
    return RADAR_PROVIDERS.eccc;
  }
  if (inBbox(lat, lon, NA_BBOX)) {
    return RADAR_PROVIDERS.nexrad;
  }
  return null;
}

/**
 * Generate evenly-spaced frame timestamps (oldest→newest) for WMS
 * providers, which have no scan-listing API — we request TIME-stepped
 * GetMap images and let the server snap to the nearest available run.
 */
export function wmsTimeSteps(hoursBack = 2, stepMin = 10, nowMs = Date.now()): number[] {
  const steps: number[] = [];
  const count = Math.floor((hoursBack * 60) / stepMin);
  for (let i = count; i >= 0; i--) {
    // Align to the step grid so consecutive loads request identical URLs.
    const t = Math.floor((nowMs - i * stepMin * 60_000) / (stepMin * 60_000)) * stepMin * 60_000;
    steps.push(t);
  }
  return steps;
}

function isoNoMillis(epochMs: number): string {
  return new Date(epochMs).toISOString().split('.')[0] + 'Z';
}

function wmsParams(
  layer: string,
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
  epochMs: number,
): string {
  // WMS 1.1.1 + SRS keeps BBOX in lon,lat order unambiguously
  // (1.3.0 flips axis order for EPSG:4326 — a classic footgun).
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layer,
    FORMAT: 'image/png',
    TRANSPARENT: 'TRUE',
    SRS: 'EPSG:4326',
    BBOX: `${west},${south},${east},${north}`,
    WIDTH: String(Math.round(width)),
    HEIGHT: String(Math.round(height)),
    TIME: isoNoMillis(epochMs),
  });
  return params.toString();
}

/**
 * ECCC GeoMet radar composite. Rain layer is precipitation rate (mm/h);
 * snow layer is the same composite rendered as snowfall rate (cm/h) —
 * switch by current conditions since a rain-only layer is useless in
 * a Canadian winter (and vice versa).
 */
export function buildEcccRadarUrl(
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
  epochMs: number,
  precipType: 'rain' | 'snow' = 'rain',
): string {
  const layer = precipType === 'snow' ? 'RADAR_1KM_RSNO' : 'RADAR_1KM_RRAI';
  return `https://geo.weather.gc.ca/geomet?${wmsParams(layer, west, south, east, north, width, height, epochMs)}`;
}

/**
 * DWD precipitation radar composite (single reflectivity layer,
 * no rain/snow split — the `precipType` arg is accepted for a
 * uniform call signature and ignored).
 */
export function buildDwdRadarUrl(
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
  epochMs: number,
): string {
  return `https://maps.dwd.de/geoserver/wms?${wmsParams('dwd:Niederschlagsradar', west, south, east, north, width, height, epochMs)}`;
}

// ---------------------------------------------------------------------------
// NASA GIBS satellite imagery (U.S. government, keyless WMS).
// Docs: https://nasa-gibs.github.io/gibs-api-docs/
// Layer names verified against the GIBS tile index + API docs.
// ---------------------------------------------------------------------------

export type SatelliteLayerId = 'goes-east' | 'goes-west' | 'viirs';

export interface SatelliteLayer {
  id: SatelliteLayerId;
  label: string;
  gibsLayer: string;
  /** Whether TIME needs full datetime (sub-daily) or just a date. */
  timeResolution: 'datetime' | 'date';
  attribution: string;
}

const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const GIBS_ATTRIBUTION = 'NASA GIBS · © OpenStreetMap · CARTO';

/**
 * GOES-East covers the eastern Americas, GOES-West the western
 * Americas and eastern Pacific (both ~10-min full disk). Everywhere
 * else falls back to daily VIIRS true color — coarser in time but
 * global and always on-disk (GOES imagery degrades past the limb).
 */
export function selectSatelliteLayer(lon: number): SatelliteLayer {
  if (lon >= -100 && lon <= -30) {
    return {
      id: 'goes-east',
      label: 'GOES-East',
      gibsLayer: 'GOES-East_ABI_GeoColor',
      timeResolution: 'datetime',
      attribution: GIBS_ATTRIBUTION,
    };
  }
  if (lon < -100 && lon >= -180) {
    return {
      id: 'goes-west',
      label: 'GOES-West',
      gibsLayer: 'GOES-West_ABI_GeoColor',
      timeResolution: 'datetime',
      attribution: GIBS_ATTRIBUTION,
    };
  }
  return {
    id: 'viirs',
    label: 'VIIRS',
    gibsLayer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    timeResolution: 'date',
    attribution: GIBS_ATTRIBUTION,
  };
}

export function buildGibsSatUrl(
  layer: SatelliteLayer,
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
  epochMs: number,
): string {
  const time =
    layer.timeResolution === 'date'
      ? new Date(epochMs).toISOString().split('T')[0]
      : isoNoMillis(epochMs);
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layer.gibsLayer,
    FORMAT: 'image/jpeg',
    SRS: 'EPSG:4326',
    BBOX: `${west},${south},${east},${north}`,
    WIDTH: String(Math.round(width)),
    HEIGHT: String(Math.round(height)),
    TIME: time,
  });
  return `${GIBS_WMS}?${params.toString()}`;
}
