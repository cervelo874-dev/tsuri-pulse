import { JAPAN_REFERENCE_PORTS } from '@/data/ports';
import {
  DailyTideData,
  HourlyTideInfo,
  ReferencePort,
  TideExtreme,
  TideName,
  TidePhaseState,
  TidePoint,
} from '@/types';

const DEG2RAD = Math.PI / 180;

/** Haversine距離 (km) */
export function calcDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) *
      Math.cos(lat2 * DEG2RAD) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 緯度経度から日本全国の最寄り基準港をマッチング */
export function findNearestPort(
  lat: number,
  lon: number
): { port: ReferencePort; distanceKm: number } {
  let bestPort = JAPAN_REFERENCE_PORTS[0];
  let minDist = Infinity;

  for (const port of JAPAN_REFERENCE_PORTS) {
    const dist = calcDistanceKm(lat, lon, port.lat, port.lon);
    if (dist < minDist) {
      minDist = dist;
      bestPort = port;
    }
  }

  return { port: bestPort, distanceKm: Math.round(minDist * 10) / 10 };
}

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** YYYY-MM-DD + JST時刻(hourFloat) から ユリウス日(UTC JD) を計算 */
function jstToJulianDay(dateStr: string, hourJst: number): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // JST = UTC + 9h
  const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0) + (hourJst - 9) * 3600 * 1000;
  return utcMs / 86400000 + 2440587.5;
}

/**
 * 太陽・月の天文黄経および月齢を算出
 */
export function calcLunarAstronomy(dateStr: string, hourJst = 12): {
  moonAge: number;
  elongationDeg: number;
   tideName: TideName;
  sDeg: number; // 月平均黄経
  hDeg: number; // 太陽平均黄経
  pDeg: number; // 月近地点平均黄経
  nDeg: number; // 月昇交点黄経
} {
  const jd = jstToJulianDay(dateStr, hourJst);
  const T = (jd - 2451545.0) / 36525.0; // J2000.0からのユリウス世紀

  // 天文基本引数 (Schureman / Meeus 近似)
  const sDeg = norm360(218.3164477 + 481267.88123421 * T);
  const hDeg = norm360(280.46646 + 36000.76983 * T);
  const pDeg = norm360(83.3532465 + 4069.0137287 * T);
  const nDeg = norm360(125.04452 - 1934.136261 * T);

  // 真黄経の主要摂動補正（太陽・月の黄経差精度向上）
  const sunMeanAnomaly = norm360(357.52911 + 35999.05029 * T) * DEG2RAD;
  const moonMeanAnomaly = norm360(134.9634 + 477198.8675 * T) * DEG2RAD;
  const sunTrueLon = norm360(
    hDeg + 1.9146 * Math.sin(sunMeanAnomaly) + 0.02 * Math.sin(2 * sunMeanAnomaly)
  );
  const moonTrueLon = norm360(
    sDeg +
      6.2888 * Math.sin(moonMeanAnomaly) +
      1.274 * Math.sin(2 * (sDeg - hDeg) * DEG2RAD - moonMeanAnomaly) +
      0.6583 * Math.sin(2 * (sDeg - hDeg) * DEG2RAD)
  );

  const elongationDeg = norm360(moonTrueLon - sunTrueLon);

  // 基準新月 (2000-01-06 18:14 UTC = JD 2451550.26) からの平均朔望月 + 黄経差補正
  const synodicMonth = 29.530588853;
  const moonAge = Math.round(((elongationDeg / 360) * synodicMonth) * 10) / 10;

  const tideName = classifyJmaTideName(elongationDeg);

  return { moonAge, elongationDeg, tideName, sDeg, hDeg, pDeg, nDeg };
}

/**
 * 気象庁方式（太陽と月の黄経差 0〜360°）による潮名分類
 */
export function classifyJmaTideName(elongationDeg: number): TideName {
  const e = norm360(elongationDeg);
  // 半朔望周期 (0〜180°) に対称マッピング
  const half = e >= 180 ? e - 180 : e;
  // JMA基準: [168..180) & [0..36) 大潮, [36..72) 中潮, [72..108) 小潮, [108..120) 長潮, [120..132) 若潮, [132..168) 中潮
  if (half >= 168 || half < 36) return '大潮';
  if (half < 72) return '中潮';
  if (half < 108) return '小潮';
  if (half < 120) return '長潮';
  if (half < 132) return '若潮';
  return '中潮';
}

/**
 * 指定港・指定日・JST時刻(hourFloat: -2〜26)における調和潮位(cm)を算出
 * 東経135°基準の天文引数 V0 + u と節因数 f を用いて主要6分潮を合成
 */
export function predictPortTideCm(
  port: ReferencePort,
  dateStr: string,
  hourFloat: number
): number {
  // 当日00:00 JSTでの天文引数
  const astro0 = calcLunarAstronomy(dateStr, 0);
  const { sDeg: s, hDeg: h, pDeg: p, nDeg: N } = astro0;
  const Nrad = N * DEG2RAD;

  // 交点因数 f と 交点補正 u (Schureman近似)
  const fM2 = 1.0 - 0.037 * Math.cos(Nrad);
  const uM2 = -2.1 * Math.sin(Nrad);

  const fK1 = 1.006 + 0.115 * Math.cos(Nrad);
  const uK1 = -8.9 * Math.sin(Nrad);

  const fO1 = 1.009 + 0.187 * Math.cos(Nrad);
  const uO1 = 10.8 * Math.sin(Nrad);

  // JST 00:00 (= 15:00前日UTC) に対する東経135度地方時天文位相 V0 (00:00地方平太陽時 T0 = 0°)
  // M2: 2*T0 - 2*s + 2*h, S2: 2*T0, N2: 2*T0 - 3*s + 2*h + p
  // K1: T0 + h + 90°, O1: T0 - 2*s + h - 90°, P1: T0 - h - 90°
  const vM2 = norm360(-2 * s + 2 * h + uM2);
  const vS2 = 0;
  const vN2 = norm360(-3 * s + 2 * h + p + uM2);
  const vK1 = norm360(h + 90 + uK1);
  const vO1 = norm360(-2 * s + h - 90 + uO1);
  const vP1 = norm360(-h - 90);

  // 各分潮の角速度 (deg/hour)
  const wM2 = 28.9841042;
  const wS2 = 30.0;
  const wN2 = 28.4397295;
  const wK1 = 15.0410686;
  const wO1 = 13.9430356;
  const wP1 = 14.9589314;

  const c = port.constituents;
  let level = port.z0;

  // M2
  level +=
    fM2 *
    c.M2[0] *
    Math.cos((vM2 + wM2 * hourFloat - c.M2[1]) * DEG2RAD);
  // S2
  level += c.S2[0] * Math.cos((vS2 + wS2 * hourFloat - c.S2[1]) * DEG2RAD);
  // K1
  level +=
    fK1 *
    c.K1[0] *
    Math.cos((vK1 + wK1 * hourFloat - c.K1[1]) * DEG2RAD);
  // O1
  level +=
    fO1 *
    c.O1[0] *
    Math.cos((vO1 + wO1 * hourFloat - c.O1[1]) * DEG2RAD);

  // N2 (未定義時はM2から自動推定)
  const n2Amp = c.N2 ? c.N2[0] : c.M2[0] * 0.19;
  const n2Lag = c.N2 ? c.N2[1] : c.M2[1] - 9;
  level += fM2 * n2Amp * Math.cos((vN2 + wN2 * hourFloat - n2Lag) * DEG2RAD);

  // P1 (未定義時はK1から自動推定)
  const p1Amp = c.P1 ? c.P1[0] : c.K1[0] * 0.33;
  const p1Lag = c.P1 ? c.P1[1] : c.K1[1] - 2;
  level += p1Amp * Math.cos((vP1 + wP1 * hourFloat - p1Lag) * DEG2RAD);

  return Math.round(level * 10) / 10;
}

function formatHourFloat(hf: number): string {
  const clamped = Math.max(0, Math.min(23 + 59 / 60, hf));
  const totalMin = Math.round(clamped * 60);
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * 選択地点(lat, lon)と日付(YYYY-MM-DD)から24時間タイドデータ一式を算出
 */
export function computeDailyTide(
  lat: number,
  lon: number,
  dateStr: string
): DailyTideData {
  const { port, distanceKm } = findNearestPort(lat, lon);
  const noonAstro = calcLunarAstronomy(dateStr, 12);

  // 15分刻みの曲線データ (00:00〜24:00 = 97点)
  const curve: TidePoint[] = [];
  for (let step = 0; step <= 96; step++) {
    const hf = step * 0.25;
    curve.push({
      hourFloat: hf,
      timeLabel: hf === 24 ? '24:00' : formatHourFloat(hf),
      levelCm: Math.round(predictPortTideCm(port, dateStr, hf)),
    });
  }

  // -2h 〜 +26h を10分刻みで走査して極値（満潮・干潮）を精密抽出
  const allExtremes: TideExtreme[] = [];
  const dt = 1 / 6; // 10分
  let prev = predictPortTideCm(port, dateStr, -2);
  let curr = predictPortTideCm(port, dateStr, -2 + dt);

  for (let t = -2 + dt; t <= 26 - dt; t += dt) {
    const next = predictPortTideCm(port, dateStr, t + dt);
    const isMax = curr > prev && curr >= next;
    const isMin = curr < prev && curr <= next;

    if (isMax || isMin) {
      // 放物線補間でピーク時刻を精密化
      const denom = prev - 2 * curr + next;
      const offset = Math.abs(denom) > 1e-4 ? (0.5 * (prev - next)) / denom : 0;
      const peakT = t + offset * dt;
      const peakLevel = Math.round(predictPortTideCm(port, dateStr, peakT));

      // 直前の極値と近すぎる微小ゆらぎを除外 (最低2.5時間間隔)
      const last = allExtremes[allExtremes.length - 1];
      if (!last || peakT - last.hourFloat >= 2.5) {
        allExtremes.push({
          type: isMax ? 'high' : 'low',
          hourFloat: peakT,
          timeStr: formatHourFloat(((peakT % 24) + 24) % 24),
          levelCm: peakLevel,
        });
      }
    }
    prev = curr;
    curr = next;
  }

  // 当日 00:00〜24:00 内の満干潮
  const extremes = allExtremes.filter(
    (e) => e.hourFloat >= 0 && e.hourFloat < 24
  );

  // その港の大潮ピーク流速目安 (cm/h) = (M2 + S2) * 0.52 + (K1 + O1) * 0.25
  const portMaxFlowRef = Math.max(
    6,
    (port.constituents.M2[0] + port.constituents.S2[0]) * 0.54 +
      (port.constituents.K1[0] + port.constituents.O1[0]) * 0.26
  );

  const levelsToday = curve.map((p) => p.levelCm);
  const minDay = Math.min(...levelsToday);
  const maxDay = Math.max(...levelsToday);
  const daySpan = Math.max(8, maxDay - minDay);

  // 1時間ごとの潮汐状態（0〜23時）
  const hourly: HourlyTideInfo[] = [];
  for (let h = 0; h < 24; h++) {
    const levelNow = predictPortTideCm(port, dateStr, h);
    const levelBefore = predictPortTideCm(port, dateStr, h - 0.5);
    const levelAfter = predictPortTideCm(port, dateStr, h + 0.5);
    const deltaCmPerHour = Math.round((levelAfter - levelBefore) * 10) / 10;

    const flowSpeedNormalized = Math.min(
      1,
      Math.abs(deltaCmPerHour) / portMaxFlowRef
    );
    const levelNormalized = Math.max(
      0,
      Math.min(1, (levelNow - minDay) / daySpan)
    );

    // 最も近い満干潮との時間差（分）
    let nearestDiffHours = 99;
    let signedDiffHours = 99; // h - extreme.hourFloat (正なら極値通過後=動き出し側)
    let nearestType: 'high' | 'low' = 'high';

    for (const ext of allExtremes) {
      const diff = Math.abs(h - ext.hourFloat);
      if (diff < nearestDiffHours) {
        nearestDiffHours = diff;
        signedDiffHours = h - ext.hourFloat;
        nearestType = ext.type;
      }
    }

    const minutesToNearestSlack = Math.round(nearestDiffHours * 60);

    let state: TidePhaseState;
    if (minutesToNearestSlack <= 35) {
      state = nearestType === 'high' ? '満潮前後' : '干潮前後';
    } else if (signedDiffHours > 0 && minutesToNearestSlack <= 95) {
      state = '動き出し';
    } else if (signedDiffHours < 0 && minutesToNearestSlack <= 80) {
      state = '止まりかけ';
    } else {
      state = deltaCmPerHour >= 0 ? '上げ潮' : '下げ潮';
    }

    hourly.push({
      hour: h,
      levelCm: Math.round(levelNow),
      deltaCmPerHour,
      flowSpeedNormalized: Math.round(flowSpeedNormalized * 100) / 100,
      levelNormalized: Math.round(levelNormalized * 100) / 100,
      state,
      minutesToNearestSlack,
      nearestExtremeType: nearestType,
    });
  }

  return {
    dateStr,
    port,
    distanceKm,
    moonAge: noonAstro.moonAge,
    lunarElongationDeg: Math.round(noonAstro.elongationDeg),
    tideName: noonAstro.tideName,
    curve,
    extremes,
    hourly,
  };
}
