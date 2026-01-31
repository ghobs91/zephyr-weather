/**
 * Sun position and times calculation
 * Based on algorithms from https://www.aa.quae.nl/en/reken/zonpositie.html
 */

const RAD = Math.PI / 180;
const DAYMS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const E = RAD * 23.4397; // obliquity of the Earth

function toJulian(date: Date): number {
  return date.getTime() / DAYMS - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * DAYMS);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

// Sun's geocentric ecliptic longitude
function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372; // perihelion of the Earth
  return M + C + P + Math.PI;
}

function sunCoords(d: number): {dec: number; ra: number} {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);

  return {
    dec: Math.asin(Math.sin(L) * Math.sin(E)),
    ra: Math.atan2(Math.sin(L) * Math.cos(E), Math.cos(L)),
  };
}

// Calculations for sun times
const J0 = 0.0009;

function julianCycle(d: number, lw: number): number {
  return Math.round(d - J0 - lw / (2 * Math.PI));
}

function approxTransit(Ht: number, lw: number, n: number): number {
  return J0 + (Ht + lw) / (2 * Math.PI) + n;
}

function solarTransitJ(ds: number, M: number, L: number): number {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
}

function observerAngle(height: number): number {
  return (-2.076 * Math.sqrt(height)) / 60;
}

function getSetJ(h: number, lw: number, phi: number, dec: number, n: number, M: number, L: number): number {
  const w = hourAngle(h, phi, dec);
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  nadir: Date;
}

/**
 * Calculate sunrise and sunset times for a given date and location
 */
export function getSunTimes(date: Date, lat: number, lng: number, height: number = 0): SunTimes {
  const lw = RAD * -lng;
  const phi = RAD * lat;

  const dh = observerAngle(height);

  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);

  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = Math.asin(Math.sin(L) * Math.sin(E));

  const Jnoon = solarTransitJ(ds, M, L);

  const h0 = (RAD * -0.833 + dh); // sun angle at sunrise/sunset

  const Jset = getSetJ(h0, lw, phi, dec, n, M, L);
  const Jrise = Jnoon - (Jset - Jnoon);

  return {
    sunrise: fromJulian(Jrise),
    sunset: fromJulian(Jset),
    solarNoon: fromJulian(Jnoon),
    nadir: fromJulian(Jnoon - 0.5),
  };
}

/**
 * Calculate daylight duration in hours
 */
export function getDaylightDuration(date: Date, lat: number, lng: number): number {
  const times = getSunTimes(date, lat, lng);
  const duration = (times.sunset.getTime() - times.sunrise.getTime()) / (1000 * 60 * 60);
  return duration;
}
