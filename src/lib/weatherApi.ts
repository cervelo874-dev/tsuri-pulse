import { DailyWeatherForecast, HourlyWeatherPoint, SpotForecastBundle } from '@/types';

const WEATHER_CACHE_PREFIX = 'tsuripulse_weather_v1_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30分

/** 日本時間(JST)基準で今日からoffset日後の YYYY-MM-DD を取得 */
export function getJstDateString(offsetDays = 0): string {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000;
  const jstDate = new Date(jstMs);
  const y = jstDate.getUTCFullYear();
  const m = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jstDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 現在のJST時刻(0〜23時)を取得 */
export function getCurrentJstHour(): number {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 3600 * 1000;
  return new Date(jstMs).getUTCHours();
}

function makeCacheKey(lat: number, lon: number): string {
  return `${WEATHER_CACHE_PREFIX}${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

function parseHhMmToHourFloat(isoTime: string): { str: string; hourFloat: number } {
  const part = isoTime.includes('T') ? isoTime.split('T')[1] : '06:00';
  const [hh, mm] = part.slice(0, 5).split(':').map(Number);
  return {
    str: `${String(hh || 0).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}`,
    hourFloat: (hh || 0) + (mm || 0) / 60,
  };
}

/**
 * オフライン時・通信制限環境でも画面が破綻せずリアルに動作する季節・緯度連動フォールバック生成
 */
export function buildEstimatedForecast(lat: number, lon: number): SpotForecastBundle {
  const days: DailyWeatherForecast[] = [];
  const seedBase = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233));

  for (let d = 0; d < 4; d++) {
    const dateStr = getJstDateString(d);
    const [, monthStr, dayStr] = dateStr.split('-');
    const month = Number(monthStr);
    const dayNum = Number(dayStr);

    // 日本の季節別平均気温カーブ + 緯度補正 (34.6°N = 関西基準)
    const seasonalTemps = [8, 9, 13, 18, 22, 25, 29, 30, 26, 20, 15, 10];
    const baseTemp = seasonalTemps[(month - 1 + 12) % 12] - (lat - 34.6) * 0.85;
    const seasonalSst = [12, 11, 12, 15, 18, 22, 25, 27, 25, 22, 18, 14];
    const sstRef =
      Math.round((seasonalSst[(month - 1 + 12) % 12] - (lat - 34.6) * 0.7) * 10) / 10;

    // 日の出・日の入り季節近似
    const summerFactor = Math.cos(((month - 6.5) / 12) * 2 * Math.PI);
    const sunriseH = 5.8 - 1.0 * summerFactor;
    const sunsetH = 18.1 + 1.1 * summerFactor;
    const srMin = Math.round(sunriseH * 60);
    const ssMin = Math.round(sunsetH * 60);
    const sunriseStr = `${String(Math.floor(srMin / 60)).padStart(2, '0')}:${String(srMin % 60).padStart(2, '0')}`;
    const sunsetStr = `${String(Math.floor(ssMin / 60)).padStart(2, '0')}:${String(ssMin % 60).padStart(2, '0')}`;

    const hourly: HourlyWeatherPoint[] = [];
    const dayShift = ((dayNum + d) * 37 + Math.round(seedBase * 100)) % 10;

    for (let h = 0; h < 24; h++) {
      const diurnal = -Math.cos(((h - 3) / 24) * 2 * Math.PI) * 3.6;
      const tempC = Math.round((baseTemp + diurnal + (d % 2 === 0 ? 0.5 : -0.6)) * 10) / 10;

      // 日中海風・朝夕穏やかになるリアルな沿岸風速パターン
      const afternoonBreeze = h >= 11 && h <= 17 ? 1.8 : h >= 5 && h <= 8 ? -0.6 : 0.2;
      const windSpeedMs = Math.max(
        0.8,
        Math.round((2.6 + afternoonBreeze + ((dayShift % 4) - 1) * 0.7 + Math.sin(h * 0.5) * 0.5) * 10) / 10
      );

      // 風向: 午前は北〜北西寄り（陸風）、午後は南西〜西寄り（海風）
      const windDirectionDeg =
        h < 11 ? (335 + d * 25 + h * 3) % 360 : (235 + d * 20 + (h - 11) * 5) % 360;

      const isCloudyWindow = (h + dayShift) % 9 >= 5;
      const isLightShower = d === 2 && h >= 13 && h <= 16;
      const weatherCode = isLightShower ? 61 : isCloudyWindow ? 2 : h >= 5 && h <= 9 ? 3 : 1;
      const precipProb = isLightShower ? 55 : isCloudyWindow ? 20 : 10;
      const precipMm = isLightShower ? 1.2 : 0;
      const past24hPrecipMm = d === 3 && h < 14 ? 4.2 : d === 1 ? 1.5 : 0;
      const waveHeightM = Math.max(
        0.15,
        Math.round((0.22 + windSpeedMs * 0.09) * 100) / 100
      );
      const pressureHpa = Math.round((1014 - d * 1.2 + Math.cos((h / 12) * Math.PI) * 1.1) * 10) / 10;
      const pressureTrend3h = Math.round((-Math.sin((h / 12) * Math.PI) * 0.9 - (d === 2 ? 1.1 : 0)) * 10) / 10;

      hourly.push({
        hour: h,
        timeIso: `${dateStr}T${String(h).padStart(2, '0')}:00`,
        weatherCode,
        tempC,
        precipProb,
        precipMm,
        past24hPrecipMm,
        windSpeedMs,
        windDirectionDeg: Math.round(windDirectionDeg),
        pressureHpa,
        pressureTrend3h,
        waveHeightM,
        seaSurfaceTempC: sstRef,
      });
    }

    const temps = hourly.map((x) => x.tempC);
    days.push({
      dateStr,
      sunriseStr,
      sunsetStr,
      sunriseHour: sunriseH,
      sunsetHour: sunsetH,
      weatherCode: hourly[12].weatherCode,
      tempMaxC: Math.max(...temps),
      tempMinC: Math.min(...temps),
      hourly,
      meanSeaSurfaceTempC: sstRef,
    });
  }

  return {
    lat,
    lon,
    fetchedAt: Date.now(),
    source: 'estimated',
    days,
  };
}

interface OpenMeteoForecastResponse {
  hourly: {
    time: string[];
    weather_code: number[];
    temperature_2m: number[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    surface_pressure: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
  };
}

interface OpenMeteoMarineResponse {
  hourly?: {
    time?: string[];
    wave_height?: (number | null)[];
    sea_surface_temperature?: (number | null)[];
  };
}

/**
 * Open-Meteo Weather Forecast API + Marine Weather API を並列取得し、
 * past_days=1 を用いた「過去24時間累積降水量」と「3時間気圧傾向」を含む4日間データを返す
 */
export async function fetchSpotForecast(
  lat: number,
  lon: number,
  forceRefresh = false
): Promise<SpotForecastBundle> {
  const cacheKey = makeCacheKey(lat, lon);

  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SpotForecastBundle;
        if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS && parsed.days?.length >= 4) {
          return { ...parsed, source: 'cache' };
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&hourly=weather_code,temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&wind_speed_unit=ms&timezone=Asia%2FTokyo&past_days=1&forecast_days=4`;

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&hourly=wave_height,sea_surface_temperature` +
    `&timezone=Asia%2FTokyo&past_days=1&forecast_days=4`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    const [weatherRes, marineRes] = await Promise.all([
      fetch(weatherUrl, { signal: controller.signal }),
      fetch(marineUrl, { signal: controller.signal }).catch(() => null),
    ]);
    clearTimeout(timer);

    if (!weatherRes.ok) {
      throw new Error(`Open-Meteo HTTP ${weatherRes.status}`);
    }

    const weatherJson = (await weatherRes.json()) as OpenMeteoForecastResponse;
    const marineJson: OpenMeteoMarineResponse | null =
      marineRes && marineRes.ok ? ((await marineRes.json()) as OpenMeteoMarineResponse) : null;

    const hTimes = weatherJson.hourly.time;
    const precipArr = weatherJson.hourly.precipitation;
    const pressureArr = weatherJson.hourly.surface_pressure;

    // Marineデータを時刻ISOでインデックス化
    const waveMap = new Map<string, number | null>();
    const sstMap = new Map<string, number | null>();
    if (marineJson?.hourly?.time) {
      marineJson.hourly.time.forEach((t, idx) => {
        waveMap.set(t, marineJson.hourly?.wave_height?.[idx] ?? null);
        sstMap.set(t, marineJson.hourly?.sea_surface_temperature?.[idx] ?? null);
      });
    }

    // past_days=1 により daily[0] は昨日、daily[1..4] が今日〜3日後
    const days: DailyWeatherForecast[] = [];
    const totalDaily = weatherJson.daily.time.length;
    const startDayIdx = totalDaily >= 5 ? 1 : 0;

    for (let dIdx = startDayIdx; dIdx < Math.min(startDayIdx + 4, totalDaily); dIdx++) {
      const dateStr = weatherJson.daily.time[dIdx];
      const sr = parseHhMmToHourFloat(weatherJson.daily.sunrise[dIdx] || '06:00');
      const ss = parseHhMmToHourFloat(weatherJson.daily.sunset[dIdx] || '18:00');

      const hourlyPoints: HourlyWeatherPoint[] = [];
      const sstSamples: number[] = [];

      for (let h = 0; h < 24; h++) {
        const isoTarget = `${dateStr}T${String(h).padStart(2, '0')}:00`;
        const idx = hTimes.indexOf(isoTarget);
        if (idx === -1) continue;

        // 過去24時間の累積降水量 (idx - 24 〜 idx - 1)
        let past24h = 0;
        for (let p = Math.max(0, idx - 24); p < idx; p++) {
          past24h += precipArr[p] ?? 0;
        }

        const currPressure = pressureArr[idx] ?? 1013;
        const prev3hPressure = idx >= 3 ? (pressureArr[idx - 3] ?? currPressure) : currPressure;
        const windSpeedMs = Math.round(((weatherJson.hourly.wind_speed_10m[idx] ?? 2.0) * 10)) / 10;

        const rawWave = waveMap.get(isoTarget);
        // 内湾奥でMarineグリッドがnullの場合は風速から近岸波高を穏やかに補完
        const waveHeightM =
          rawWave !== null && rawWave !== undefined
            ? Math.round(rawWave * 100) / 100
            : Math.max(0.1, Math.round((0.14 + windSpeedMs * 0.085) * 100) / 100);

        const rawSst = sstMap.get(isoTarget) ?? null;
        const sstRounded = rawSst !== null ? Math.round(rawSst * 10) / 10 : null;
        if (sstRounded !== null) sstSamples.push(sstRounded);

        hourlyPoints.push({
          hour: h,
          timeIso: isoTarget,
          weatherCode: weatherJson.hourly.weather_code[idx] ?? 1,
          tempC: Math.round((weatherJson.hourly.temperature_2m[idx] ?? 18) * 10) / 10,
          precipProb: Math.round(weatherJson.hourly.precipitation_probability[idx] ?? 0),
          precipMm: Math.round((precipArr[idx] ?? 0) * 10) / 10,
          past24hPrecipMm: Math.round(past24h * 10) / 10,
          windSpeedMs,
          windDirectionDeg: Math.round(weatherJson.hourly.wind_direction_10m[idx] ?? 0),
          pressureHpa: Math.round(currPressure * 10) / 10,
          pressureTrend3h: Math.round((currPressure - prev3hPressure) * 10) / 10,
          waveHeightM,
          seaSurfaceTempC: sstRounded,
        });
      }

      const meanSst =
        sstSamples.length > 0
          ? Math.round((sstSamples.reduce((a, b) => a + b, 0) / sstSamples.length) * 10) / 10
          : null;

      days.push({
        dateStr,
        sunriseStr: sr.str,
        sunsetStr: ss.str,
        sunriseHour: sr.hourFloat,
        sunsetHour: ss.hourFloat,
        weatherCode: weatherJson.daily.weather_code[dIdx] ?? 1,
        tempMaxC: Math.round((weatherJson.daily.temperature_2m_max[dIdx] ?? 20) * 10) / 10,
        tempMinC: Math.round((weatherJson.daily.temperature_2m_min[dIdx] ?? 12) * 10) / 10,
        hourly: hourlyPoints,
        meanSeaSurfaceTempC: meanSst,
      });
    }

    const bundle: SpotForecastBundle = {
      lat,
      lon,
      fetchedAt: Date.now(),
      source: 'live',
      days,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(bundle));
      } catch {
        // ignore quota errors
      }
    }

    return bundle;
  } catch {
    // 期限切れキャッシュがあれば優先利用し、なければ推定データへ優雅にフォールバック
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as SpotForecastBundle;
          if (parsed.days?.length >= 1) {
            return { ...parsed, source: 'cache' };
          }
        }
      } catch {
        // ignore
      }
    }
    return buildEstimatedForecast(lat, lon);
  }
}
