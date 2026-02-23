/**
 * NEXRAD Radar Service
 *
 * Fetches real-time NEXRAD WSR-88D Level 2 radar scan metadata from the
 * public AWS S3 bucket (unidata-nexrad-level2). No API key required.
 *
 * The rendered radar overlay is provided by NOAA's ArcGIS ImageServer,
 * which composites NEXRAD base reflectivity data into map imagery.
 */
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NexradStation {
  code: string;
  lat: number;
  lon: number;
}

export interface NexradScan {
  key: string;
  epochMs: number;
}

// ---------------------------------------------------------------------------
// NEXRAD WSR-88D Station Database
// Coordinates from NOAA Radar Operations Center
// https://www.roc.noaa.gov/WSR88D/Program/NetworkSites.aspx
// ---------------------------------------------------------------------------

const NEXRAD_STATIONS: NexradStation[] = [
  {code: 'KABR', lat: 45.4558, lon: -98.4131},
  {code: 'KABX', lat: 35.1497, lon: -106.8236},
  {code: 'KAKQ', lat: 36.984, lon: -77.0077},
  {code: 'KAMA', lat: 35.2334, lon: -101.7092},
  {code: 'KAMX', lat: 25.6111, lon: -80.4128},
  {code: 'KAPX', lat: 44.9072, lon: -84.7197},
  {code: 'KARX', lat: 43.8228, lon: -91.1914},
  {code: 'KATX', lat: 48.1944, lon: -122.4958},
  {code: 'KBBX', lat: 39.4961, lon: -121.6317},
  {code: 'KBGM', lat: 42.1997, lon: -75.9847},
  {code: 'KBHX', lat: 40.4986, lon: -124.2919},
  {code: 'KBIS', lat: 46.7708, lon: -100.7606},
  {code: 'KBLX', lat: 45.8537, lon: -108.6068},
  {code: 'KBMX', lat: 33.1722, lon: -86.7697},
  {code: 'KBOX', lat: 41.9556, lon: -71.1375},
  {code: 'KBRO', lat: 25.9159, lon: -97.4189},
  {code: 'KBUF', lat: 42.9486, lon: -78.7369},
  {code: 'KBYX', lat: 24.5975, lon: -81.7033},
  {code: 'KCAE', lat: 33.9486, lon: -81.1183},
  {code: 'KCBW', lat: 46.0392, lon: -67.8067},
  {code: 'KCBX', lat: 43.4906, lon: -116.2356},
  {code: 'KCCX', lat: 40.9228, lon: -78.0039},
  {code: 'KCLE', lat: 41.4131, lon: -81.8597},
  {code: 'KCLX', lat: 32.6556, lon: -81.0422},
  {code: 'KCRP', lat: 27.7842, lon: -97.5111},
  {code: 'KCXX', lat: 44.5111, lon: -73.1667},
  {code: 'KCYS', lat: 41.1519, lon: -104.8061},
  {code: 'KDAX', lat: 38.5011, lon: -121.6778},
  {code: 'KDDC', lat: 37.7608, lon: -99.9686},
  {code: 'KDGX', lat: 32.2797, lon: -89.9842},
  {code: 'KDIX', lat: 39.9472, lon: -74.4108},
  {code: 'KDLH', lat: 46.8369, lon: -92.2097},
  {code: 'KDMX', lat: 41.7311, lon: -93.7228},
  {code: 'KDOX', lat: 38.8256, lon: -75.44},
  {code: 'KDTX', lat: 42.6999, lon: -83.4717},
  {code: 'KDVN', lat: 41.6117, lon: -90.5811},
  {code: 'KDYX', lat: 32.5386, lon: -99.2542},
  {code: 'KEAX', lat: 38.8103, lon: -94.2644},
  {code: 'KEMX', lat: 31.8936, lon: -110.6303},
  {code: 'KENX', lat: 42.5864, lon: -74.0639},
  {code: 'KEOX', lat: 31.4606, lon: -85.4594},
  {code: 'KEPZ', lat: 31.8731, lon: -106.6981},
  {code: 'KESX', lat: 35.7011, lon: -114.8914},
  {code: 'KEVX', lat: 30.5644, lon: -85.9214},
  {code: 'KEWX', lat: 29.7039, lon: -98.0286},
  {code: 'KEYX', lat: 35.0978, lon: -117.5608},
  {code: 'KFCX', lat: 37.0242, lon: -80.2742},
  {code: 'KFDR', lat: 34.3622, lon: -98.9764},
  {code: 'KFDX', lat: 34.6353, lon: -103.6192},
  {code: 'KFFC', lat: 33.3636, lon: -84.5658},
  {code: 'KFSD', lat: 43.5878, lon: -96.7292},
  {code: 'KFSX', lat: 34.5744, lon: -111.1983},
  {code: 'KFTG', lat: 39.7867, lon: -104.5458},
  {code: 'KFWS', lat: 32.5731, lon: -97.3031},
  {code: 'KGGW', lat: 48.2064, lon: -106.6253},
  {code: 'KGJX', lat: 39.0622, lon: -108.2136},
  {code: 'KGLD', lat: 39.3667, lon: -101.7004},
  {code: 'KGRB', lat: 44.4986, lon: -88.1111},
  {code: 'KGRK', lat: 30.7217, lon: -97.3828},
  {code: 'KGRR', lat: 42.8939, lon: -85.5447},
  {code: 'KGSP', lat: 34.8831, lon: -82.22},
  {code: 'KGWX', lat: 33.8967, lon: -88.3289},
  {code: 'KGYX', lat: 43.8914, lon: -70.2564},
  {code: 'KHDX', lat: 33.0764, lon: -106.12},
  {code: 'KHGX', lat: 29.4719, lon: -95.0792},
  {code: 'KHNX', lat: 36.3142, lon: -119.6319},
  {code: 'KHPX', lat: 36.7367, lon: -87.2847},
  {code: 'KHTX', lat: 34.9306, lon: -86.0833},
  {code: 'KICT', lat: 37.6544, lon: -97.4431},
  {code: 'KICX', lat: 37.5908, lon: -112.8622},
  {code: 'KILN', lat: 39.4203, lon: -83.8217},
  {code: 'KILX', lat: 40.1506, lon: -89.3369},
  {code: 'KIND', lat: 39.7075, lon: -86.2803},
  {code: 'KINX', lat: 36.175, lon: -95.5647},
  {code: 'KIWA', lat: 33.2892, lon: -111.67},
  {code: 'KIWX', lat: 41.3586, lon: -85.7},
  {code: 'KJAX', lat: 30.4847, lon: -81.7019},
  {code: 'KJGX', lat: 32.6753, lon: -83.3511},
  {code: 'KJKL', lat: 37.5908, lon: -83.3133},
  {code: 'KLBB', lat: 33.6539, lon: -101.8142},
  {code: 'KLCH', lat: 30.1253, lon: -93.2156},
  {code: 'KLGX', lat: 47.1158, lon: -124.1069},
  {code: 'KLNX', lat: 41.9578, lon: -100.5764},
  {code: 'KLOT', lat: 41.6044, lon: -88.0847},
  {code: 'KLRX', lat: 40.7397, lon: -116.8025},
  {code: 'KLSX', lat: 38.6986, lon: -90.6828},
  {code: 'KLTX', lat: 33.9892, lon: -78.4292},
  {code: 'KLVX', lat: 37.9753, lon: -85.9439},
  {code: 'KLWX', lat: 38.9753, lon: -77.4778},
  {code: 'KLZK', lat: 34.8364, lon: -92.2622},
  {code: 'KMAF', lat: 31.9433, lon: -102.1894},
  {code: 'KMAX', lat: 42.0808, lon: -122.7161},
  {code: 'KMBX', lat: 48.3925, lon: -100.8644},
  {code: 'KMHX', lat: 34.7758, lon: -76.8764},
  {code: 'KMKX', lat: 42.9678, lon: -88.5506},
  {code: 'KMLB', lat: 28.1131, lon: -80.6542},
  {code: 'KMOB', lat: 30.6794, lon: -88.2397},
  {code: 'KMPX', lat: 44.8489, lon: -93.5653},
  {code: 'KMQT', lat: 46.5311, lon: -87.5486},
  {code: 'KMRX', lat: 36.1686, lon: -83.4017},
  {code: 'KMSX', lat: 47.0411, lon: -113.9861},
  {code: 'KMTX', lat: 41.2628, lon: -112.4481},
  {code: 'KMUX', lat: 37.1553, lon: -121.8983},
  {code: 'KMVX', lat: 47.5281, lon: -97.3256},
  {code: 'KMXX', lat: 32.5367, lon: -85.7897},
  {code: 'KNKX', lat: 32.9189, lon: -117.0419},
  {code: 'KNQA', lat: 35.3447, lon: -89.8733},
  {code: 'KOAX', lat: 41.3203, lon: -96.3667},
  {code: 'KOHX', lat: 36.2472, lon: -86.5625},
  {code: 'KOKX', lat: 40.8656, lon: -72.8639},
  {code: 'KOTX', lat: 47.6806, lon: -117.6267},
  {code: 'KPAH', lat: 37.0683, lon: -88.7719},
  {code: 'KPBZ', lat: 40.5317, lon: -80.0219},
  {code: 'KPDT', lat: 45.6906, lon: -118.8531},
  {code: 'KPOE', lat: 31.1556, lon: -92.9756},
  {code: 'KPUX', lat: 38.4597, lon: -104.1817},
  {code: 'KRAX', lat: 35.6656, lon: -78.4903},
  {code: 'KRGX', lat: 39.7542, lon: -119.4614},
  {code: 'KRIW', lat: 43.0661, lon: -108.4772},
  {code: 'KRLX', lat: 38.3111, lon: -81.7228},
  {code: 'KRTX', lat: 45.715, lon: -122.9653},
  {code: 'KSFX', lat: 43.1058, lon: -112.6861},
  {code: 'KSGF', lat: 37.2353, lon: -93.4006},
  {code: 'KSHV', lat: 32.4508, lon: -93.8414},
  {code: 'KSJT', lat: 31.3714, lon: -100.4925},
  {code: 'KSOX', lat: 33.8178, lon: -117.6358},
  {code: 'KSRX', lat: 35.2906, lon: -94.3619},
  {code: 'KTBW', lat: 27.7056, lon: -82.4017},
  {code: 'KTFX', lat: 47.4597, lon: -111.3853},
  {code: 'KTLH', lat: 30.3975, lon: -84.3289},
  {code: 'KTLX', lat: 35.3331, lon: -97.2778},
  {code: 'KTWX', lat: 38.9969, lon: -96.2325},
  {code: 'KTYX', lat: 43.7556, lon: -75.68},
  {code: 'KUDX', lat: 44.125, lon: -102.8297},
  {code: 'KUEX', lat: 40.3211, lon: -98.4419},
  {code: 'KVAX', lat: 30.89, lon: -83.0019},
  {code: 'KVBX', lat: 34.8383, lon: -120.3978},
  {code: 'KVNX', lat: 36.7406, lon: -98.1278},
  {code: 'KVTX', lat: 34.4122, lon: -119.1794},
  {code: 'KVWX', lat: 38.2603, lon: -87.7247},
  {code: 'KYUX', lat: 32.4953, lon: -114.6567},
  // Alaska
  {code: 'PACG', lat: 56.8525, lon: -135.5294},
  {code: 'PAEC', lat: 64.5114, lon: -165.295},
  {code: 'PAHG', lat: 60.7258, lon: -151.3514},
  {code: 'PAIH', lat: 59.4614, lon: -146.3031},
  {code: 'PAKC', lat: 58.6794, lon: -156.6294},
  {code: 'PAPD', lat: 65.035, lon: -147.5014},
  // Pacific
  {code: 'PGUA', lat: 13.4544, lon: 144.8111},
  // Hawaii
  {code: 'PHKI', lat: 21.8942, lon: -159.5522},
  {code: 'PHKM', lat: 20.1256, lon: -155.7781},
  {code: 'PHMO', lat: 21.1328, lon: -157.1803},
  {code: 'PHWA', lat: 19.095, lon: -155.5689},
  // Puerto Rico
  {code: 'TJUA', lat: 18.1156, lon: -66.0781},
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find the nearest NEXRAD WSR-88D station to a given coordinate.
 */
export function findNearestStation(
  lat: number,
  lon: number,
): NexradStation & {distanceKm: number} {
  let best = NEXRAD_STATIONS[0];
  let bestDist = Infinity;
  for (const s of NEXRAD_STATIONS) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return {...best, distanceKm: Math.round(bestDist)};
}

/**
 * Query the NOAA NEXRAD Level 2 archive on AWS S3 for available volume scans.
 * Bucket: unidata-nexrad-level2 (public, no auth required).
 * Returns scans within the last `hoursBack` hours, sorted oldest→newest.
 */
export async function getAvailableScans(
  stationCode: string,
  hoursBack = 4,
): Promise<NexradScan[]> {
  const now = Date.now();
  const scans: NexradScan[] = [];

  // Build date prefixes to check (today, and yesterday if near UTC midnight)
  const today = new Date(now);
  const datePrefixes: string[] = [formatDatePrefix(today)];

  if (today.getUTCHours() < hoursBack) {
    const yesterday = new Date(now - 86_400_000);
    datePrefixes.unshift(formatDatePrefix(yesterday));
  }

  for (const prefix of datePrefixes) {
    try {
      const url = `https://unidata-nexrad-level2.s3.amazonaws.com/?list-type=2&prefix=${prefix}/${stationCode}/&max-keys=500`;
      const resp = await axios.get(url, {responseType: 'text', timeout: 12000});
      scans.push(...parseS3Listing(resp.data));
    } catch (err) {
      console.warn(`NEXRAD S3 listing failed for ${prefix}/${stationCode}`, err);
    }
  }

  const cutoff = now - hoursBack * 3_600_000;
  return scans
    .filter(s => s.epochMs >= cutoff && s.epochMs <= now)
    .sort((a, b) => a.epochMs - b.epochMs);
}

/**
 * Select evenly-spaced frames from a list of scans for smooth animation.
 */
export function pickAnimationFrames(
  scans: NexradScan[],
  maxFrames = 20,
): NexradScan[] {
  if (scans.length <= maxFrames) {
    return scans;
  }
  const step = (scans.length - 1) / (maxFrames - 1);
  const frames: NexradScan[] = [];
  for (let i = 0; i < maxFrames; i++) {
    frames.push(scans[Math.round(i * step)]);
  }
  return frames;
}

// ---------------------------------------------------------------------------
// NOAA ImageServer — renders NEXRAD base reflectivity as a map overlay
// ---------------------------------------------------------------------------

/**
 * Convert an EPSG:4326 bounding box to EPSG:3857 (Web Mercator).
 */
function bboxTo3857(west: number, south: number, east: number, north: number) {
  const toMerc = (lon: number, lat: number) => {
    const x = (lon * 20037508.34) / 180;
    let y =
      Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
    y = (y * 20037508.34) / 180;
    return {x, y};
  };
  const sw = toMerc(west, south);
  const ne = toMerc(east, north);
  return {xmin: sw.x, ymin: sw.y, xmax: ne.x, ymax: ne.y};
}

/**
 * Build a NOAA ImageServer exportImage URL for NEXRAD base reflectivity
 * at a given bounding box and point in time.
 */
export function buildRadarImageUrl(
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
  epochMs: number,
): string {
  const merc = bboxTo3857(west, south, east, north);
  const bbox = `${merc.xmin},${merc.ymin},${merc.xmax},${merc.ymax}`;
  const params = new URLSearchParams({
    bbox,
    bboxSR: '3857',
    imageSR: '3857',
    size: `${Math.round(width)},${Math.round(height)}`,
    format: 'png32',
    transparent: 'true',
    time: String(epochMs),
    f: 'image',
  });
  return `https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/exportImage?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatDatePrefix(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

/**
 * Parse the S3 ListObjectsV2 XML response to extract scan keys & timestamps.
 * File-name pattern: STATION_YYYYMMDD_HHMMSS_V06
 */
function parseS3Listing(xml: string): NexradScan[] {
  const scans: NexradScan[] = [];
  const keyRe = /<Key>([^<]+)<\/Key>/g;
  let m;
  while ((m = keyRe.exec(xml)) !== null) {
    const key = m[1];
    // Skip metadata (MDM) files and directory markers
    if (key.includes('_MDM') || key.endsWith('/')) {
      continue;
    }
    const ts = extractTimestamp(key);
    if (ts !== null) {
      scans.push({key, epochMs: ts});
    }
  }
  return scans;
}

/**
 * Extract a UTC epoch from a NEXRAD filename.
 * Example key: 2026/02/22/KFWS/KFWS20260222_120345_V06
 */
function extractTimestamp(key: string): number | null {
  const filename = key.split('/').pop() || '';
  const match = filename.match(
    /\w{4}(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
  );
  if (!match) {
    return null;
  }
  const [, yr, mo, dy, hr, mn, sc] = match;
  return Date.UTC(+yr, +mo - 1, +dy, +hr, +mn, +sc);
}
