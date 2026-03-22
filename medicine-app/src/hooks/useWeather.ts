import { db } from '../db/database';
import type { WeatherLog } from '../types';

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    surface_pressure: number;
    weather_code: number;
  };
}

// WMO weather code to description mapping (simplified)
function weatherCodeToDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 9) return 'Foggy';
  if (code <= 19) return 'Drizzle';
  if (code <= 29) return 'Rain';
  if (code <= 39) return 'Snow';
  if (code <= 49) return 'Sleet';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain showers';
  if (code <= 94) return 'Snow showers';
  return 'Thunderstorm';
}

async function getCoordinates(): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

export async function fetchAndSaveWeather(profileId: number, date: string): Promise<WeatherLog | null> {
  // Check if already fetched today
  const existing = await db.weatherLogs
    .where('profileId').equals(profileId)
    .and(w => w.date === date)
    .first();
  if (existing) return existing;

  const coords = await getCoordinates();
  if (!coords) return null;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data: OpenMeteoResponse = await resp.json();

    // Reverse-geocode city name (using a simple approach)
    let city: string | undefined;
    try {
      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`
      );
      if (geoResp.ok) {
        const geo = await geoResp.json();
        city = geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? geo.address?.county;
      }
    } catch { /* city remains undefined */ }

    const log: WeatherLog = {
      profileId,
      date,
      tempC: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      pressure: data.current.surface_pressure,
      description: weatherCodeToDescription(data.current.weather_code),
      city,
      fetchedAt: Date.now(),
    };

    await db.weatherLogs.add(log);
    return log;
  } catch {
    return null;
  }
}

export async function getWeatherForDate(profileId: number, date: string): Promise<WeatherLog | undefined> {
  return db.weatherLogs.where('profileId').equals(profileId).and(w => w.date === date).first();
}
