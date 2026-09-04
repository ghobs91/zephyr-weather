const {
  selectRadarProvider,
  wmsTimeSteps,
  buildEcccRadarUrl,
  buildDwdRadarUrl,
  selectSatelliteLayer,
  buildGibsSatUrl,
} = require('../radarProviders');

describe('selectRadarProvider', () => {
  test('US location uses NEXRAD', () => {
    expect(selectRadarProvider(40.71, -74.0, 'US')?.id).toBe('nexrad');
  });

  test('Canadian location uses ECCC', () => {
    expect(selectRadarProvider(43.65, -79.38, 'CA')?.id).toBe('eccc');
  });

  test('high-latitude North America without country code uses ECCC', () => {
    expect(selectRadarProvider(60, -135)?.id).toBe('eccc');
  });

  test('central Europe uses DWD', () => {
    expect(selectRadarProvider(52.52, 13.4, 'DE')?.id).toBe('dwd');
  });

  test('regions without a gov source return null', () => {
    expect(selectRadarProvider(-33.87, 151.21, 'AU')).toBeNull();
    expect(selectRadarProvider(35.68, 139.69, 'JP')).toBeNull();
  });
});

describe('wmsTimeSteps', () => {
  test('generates oldest-to-newest steps on a 10-minute grid', () => {
    const steps = wmsTimeSteps(2, 10);
    expect(steps.length).toBe(13);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    }
    for (const t of steps) {
      expect(t % (10 * 60_000)).toBe(0);
    }
  });
});

describe('WMS URL builders', () => {
  test('ECCC rain and snow layers differ', () => {
    const rain = buildEcccRadarUrl(-80, 43, -79, 44, 800, 600, 1700000000000, 'rain');
    const snow = buildEcccRadarUrl(-80, 43, -79, 44, 800, 600, 1700000000000, 'snow');
    expect(rain).toContain('RADAR_1KM_RRAI');
    expect(snow).toContain('RADAR_1KM_RSNO');
    expect(rain).toContain('geo.weather.gc.ca');
    expect(rain).toContain('TIME=');
  });

  test('DWD URL points at the gov geoserver', () => {
    const url = buildDwdRadarUrl(5, 47, 16, 55, 800, 600, 1700000000000);
    expect(url).toContain('maps.dwd.de');
    expect(url).toContain('Niederschlagsradar');
  });
});

describe('selectSatelliteLayer', () => {
  test('eastern Americas use GOES-East', () => {
    expect(selectSatelliteLayer(-74).id).toBe('goes-east');
  });

  test('western Americas use GOES-West', () => {
    expect(selectSatelliteLayer(-122).id).toBe('goes-west');
    expect(selectSatelliteLayer(-157).id).toBe('goes-west');
  });

  test('Europe, Asia, and Oceania use global VIIRS true color', () => {
    expect(selectSatelliteLayer(13.4).id).toBe('viirs');
    expect(selectSatelliteLayer(139.7).id).toBe('viirs');
    expect(selectSatelliteLayer(151.2).id).toBe('viirs');
  });
});

describe('buildGibsSatUrl', () => {
  test('GOES URL uses datetime TIME on the GIBS WMS endpoint', () => {
    const layer = selectSatelliteLayer(-74);
    const url = buildGibsSatUrl(layer, -80, 35, -70, 45, 800, 600, 1700000000000);
    expect(url).toContain('gibs.earthdata.nasa.gov');
    expect(url).toContain('GOES-East_ABI_GeoColor');
    expect(url).toContain('TIME=2023-11-14T22%3A13%3A20Z');
  });

  test('VIIRS URL uses date-only TIME', () => {
    const layer = selectSatelliteLayer(13.4);
    const url = buildGibsSatUrl(layer, 5, 47, 16, 55, 800, 600, 1700000000000);
    expect(url).toContain('VIIRS_SNPP_CorrectedReflectance_TrueColor');
    expect(url).toContain('TIME=2023-11-14');
  });
});
