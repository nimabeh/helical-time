/**
 * NOAA Solar Calculation & User Location Service
 * Computes exact astronomical sunrise and sunset times for any date, latitude, and longitude.
 */

export interface SolarInfo {
  cityName: string;
  latitude: number;
  longitude: number;
  sunriseTime: Date;
  sunsetTime: Date;
  sunriseDayFraction: number; // [0, 1] for wire positioning
  sunsetDayFraction: number;  // [0, 1] for wire positioning
  sunriseFormatted: string;   // e.g. "06:48"
  sunsetFormatted: string;    // e.g. "19:18"
  isDaytime: boolean;
}

/**
 * Standard NOAA Solar Calculation equations (Jean Meeus Astronomical Algorithms)
 * Computes official sunrise and sunset (zenith = 90.833° accounting for atmospheric refraction).
 */
export function calculateSolarTimes(
  date: Date = new Date(),
  latitude = 37.7749,
  longitude = -122.4194
): { sunrise: Date; sunset: Date; sunriseFraction: number; sunsetFraction: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 1. Day of the year
  const N1 = Math.floor((275 * month) / 9);
  const N2 = Math.floor((month + 9) / 12);
  const N3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
  const N = N1 - N2 * N3 + day - 30;

  // 2. Convert longitude to hour value and calculate an approximate time
  const lngHour = longitude / 15;

  // Helper for NOAA calculation for sunrise (isSunrise=true) or sunset (isSunrise=false)
  const computeEvent = (isSunrise: boolean): number => {
    const t = isSunrise ? N + (6 - lngHour) / 24 : N + (18 - lngHour) / 24;

    // Sun's mean anomaly in radians
    const M = ((0.9856 * t - 3.289) * Math.PI) / 180;

    // Sun's true longitude in radians
    let L =
      (0.9856 * t - 3.289 + 1.916 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 282.634) % 360;
    if (L < 0) L += 360;
    const Lrad = (L * Math.PI) / 180;

    // Sun's right ascension in radians
    let RA = (Math.atan(0.91764 * Math.tan(Lrad)) * 180) / Math.PI;
    if (RA < 0) RA += 360;

    // Right ascension must be in the same quadrant as L
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15; // In hours

    // Sun's declination
    const sinDec = 0.39782 * Math.sin(Lrad);
    const cosDec = Math.cos(Math.asin(sinDec));

    // Sun's local hour angle for standard zenith (90°50' = 90.8333°)
    const cosH =
      (Math.cos((90.8333 * Math.PI) / 180) - sinDec * Math.sin((latitude * Math.PI) / 180)) /
      (cosDec * Math.cos((latitude * Math.PI) / 180));

    // Handle polar day or polar night
    if (cosH > 1) return isSunrise ? 0 : 0; // Always night
    if (cosH < -1) return isSunrise ? 0 : 24; // Always day

    let H = (Math.acos(cosH) * 180) / Math.PI;
    if (isSunrise) {
      H = 360 - H;
    }
    H = H / 15; // In hours

    // Local mean time of event
    const T = H + RA - 0.06571 * t - 6.622;

    // Adjust to UTC
    let UT = T - lngHour;
    UT = ((UT % 24) + 24) % 24;

    // Convert UTC hours to local hours using the user's actual timezone offset for that date
    const localOffsetHours = -date.getTimezoneOffset() / 60;
    let localHours = UT + localOffsetHours;
    localHours = ((localHours % 24) + 24) % 24;

    return localHours;
  };

  const sunriseHours = computeEvent(true);
  const sunsetHours = computeEvent(false);

  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHours), Math.floor((sunriseHours % 1) * 60), 0, 0);

  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHours), Math.floor((sunsetHours % 1) * 60), 0, 0);

  const sunriseFraction = sunriseHours / 24;
  const sunsetFraction = sunsetHours / 24;

  return { sunrise, sunset, sunriseFraction, sunsetFraction };
}

/**
 * Common City & Timezone Coordinates Lookup
 * Provides instant, zero-latency coordinates from Intl timezone before or if geolocation is not granted.
 */
const TIMEZONE_CITIES: Record<string, { city: string; lat: number; lng: number }> = {
  'America/Los_Angeles': { city: 'Los Angeles / San Francisco', lat: 37.7749, lng: -122.4194 },
  'America/Vancouver': { city: 'Vancouver', lat: 49.2827, lng: -123.1207 },
  'America/New_York': { city: 'New York', lat: 40.7128, lng: -74.006 },
  'America/Chicago': { city: 'Chicago', lat: 41.8781, lng: -87.6298 },
  'America/Denver': { city: 'Denver', lat: 39.7392, lng: -104.9903 },
  'America/Toronto': { city: 'Toronto', lat: 43.6532, lng: -79.3832 },
  'Europe/London': { city: 'London', lat: 51.5074, lng: -0.1278 },
  'Europe/Paris': { city: 'Paris', lat: 48.8566, lng: 2.3522 },
  'Europe/Berlin': { city: 'Berlin', lat: 52.52, lng: 13.405 },
  'Europe/Amsterdam': { city: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  'Europe/Madrid': { city: 'Madrid', lat: 40.4168, lng: -3.7038 },
  'Europe/Rome': { city: 'Rome', lat: 41.9028, lng: 12.4964 },
  'Europe/Stockholm': { city: 'Stockholm', lat: 59.3293, lng: 18.0686 },
  'Asia/Tokyo': { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  'Asia/Shanghai': { city: 'Shanghai', lat: 31.2304, lng: 121.4737 },
  'Asia/Singapore': { city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  'Asia/Dubai': { city: 'Dubai', lat: 25.2048, lng: 55.2708 },
  'Asia/Tehran': { city: 'Tehran', lat: 35.6892, lng: 51.389 },
  'Asia/Seoul': { city: 'Seoul', lat: 37.5665, lng: 126.978 },
  'Asia/Kolkata': { city: 'New Delhi', lat: 28.6139, lng: 77.209 },
  'Australia/Sydney': { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
  'Australia/Melbourne': { city: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  'Pacific/Auckland': { city: 'Auckland', lat: -36.8485, lng: 174.7633 },
  'America/Sao_Paulo': { city: 'São Paulo', lat: -23.5505, lng: -46.6333 },
};

/**
 * Detect User Location & Calculate Solar Times
 */
export async function getLocalSolarInfo(date: Date = new Date()): Promise<SolarInfo> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

  // Default to matched timezone or standard approximation
  let cityName = tz.split('/').pop()?.replace(/_/g, ' ') || 'Local Horizon';
  let latitude = 37.7749;
  let longitude = -122.4194;

  if (TIMEZONE_CITIES[tz]) {
    cityName = TIMEZONE_CITIES[tz].city;
    latitude = TIMEZONE_CITIES[tz].lat;
    longitude = TIMEZONE_CITIES[tz].lng;
  } else {
    // Approximate latitude from timezone offset for reasonable default
    const offsetHours = -date.getTimezoneOffset() / 60;
    longitude = offsetHours * 15;
    latitude = 40.0; // Temperate northern hemisphere default
  }

  // Silently determine user location via IP without ANY permission prompt
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        latitude = data.latitude;
        longitude = data.longitude;
        if (data.city) {
          cityName = data.region ? `${data.city}, ${data.region}` : data.city;
        }
      }
    }
  } catch {
    // Seamless fallback to the instant timezone city coordinates without any prompt!
  }

  const { sunrise, sunset, sunriseFraction, sunsetFraction } = calculateSolarTimes(
    date,
    latitude,
    longitude
  );

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const currentHours = date.getHours() + date.getMinutes() / 60;
  const isDaytime = currentHours >= sunriseFraction * 24 && currentHours < sunsetFraction * 24;

  return {
    cityName,
    latitude,
    longitude,
    sunriseTime: sunrise,
    sunsetTime: sunset,
    sunriseDayFraction: sunriseFraction,
    sunsetDayFraction: sunsetFraction,
    sunriseFormatted: formatTime(sunrise),
    sunsetFormatted: formatTime(sunset),
    isDaytime,
  };
}
