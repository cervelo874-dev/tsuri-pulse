import { WindRelation } from '@/types';

const COMPASS_16_JA = [
  '北',
  '北北東',
  '北東',
  '東北東',
  '東',
  '東南東',
  '南東',
  '南南東',
  '南',
  '南南西',
  '南西',
  '西南西',
  '西',
  '西北西',
  '北西',
  '北北西',
] as const;

/** 角度(0〜360°)を16方位の日本語表記へ変換 */
export function degToCompassJa(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 22.5) % 16;
  return COMPASS_16_JA[idx];
}

/** 2つの角度(0〜360°)の最小角度差(0〜180°) */
export function smallestAngleDiff(a: number, b: number): number {
  const diff = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return diff;
}

export interface WindJudgment {
  relation: WindRelation;
  /** 表示ラベル: 追い風◎ / 横風△ / 向かい風✕ / 微風◎ */
  badgeLabel: string;
  shortStatus: '◎' | '△' | '✕';
  description: string;
  /** 風が吹いていく進行方向 (0〜360°, コンパス矢印の先端向き) */
  windBlowingToDeg: number;
  windFromLabel: string;
  seaFacingLabel: string;
}

/**
 * スポットの「海の方角 (seaDirectionDeg: 堤防から海を見る向き)」と
 * 気象の「風向 (windFromDeg: 風が吹いてくる方角)」を比較して追い風・横風・向かい風を判定
 */
export function evaluateWindRelation(
  windFromDeg: number,
  windSpeedMs: number,
  seaDirectionDeg: number
): WindJudgment {
  const windBlowingToDeg = (windFromDeg + 180) % 360;
  const diff = smallestAngleDiff(windBlowingToDeg, seaDirectionDeg);
  const windFromLabel = `${degToCompassJa(windFromDeg)}の風`;
  const seaFacingLabel = `${degToCompassJa(seaDirectionDeg)}向き`;

  if (windSpeedMs < 1.4) {
    return {
      relation: 'calm',
      badgeLabel: '微風・凪 ◎',
      shortStatus: '◎',
      description: 'ほぼ無風〜そよ風で糸ふけが少なく、初心者でもとても釣りやすい状態！',
      windBlowingToDeg,
      windFromLabel,
      seaFacingLabel,
    };
  }

  if (diff <= 52) {
    return {
      relation: 'tailwind',
      badgeLabel: '追い風 ◎',
      shortStatus: '◎',
      description:
        windSpeedMs <= 5.5
          ? '背中から海へ吹く追い風！仕掛けがよく飛び、足元の海面も穏やかになりやすい好条件。'
          : '追い風ですが風速が強めです。足場や帽子・軽量タックルの突風に注意しましょう。',
      windBlowingToDeg,
      windFromLabel,
      seaFacingLabel,
    };
  }

  if (diff >= 128) {
    return {
      relation: 'headwind',
      badgeLabel: '向かい風 ✕',
      shortStatus: '✕',
      description:
        windSpeedMs >= 4.5
          ? '海から正面に吹きつける向かい風。仕掛けが押し戻されやすく、波しぶきにも注意！'
          : '正面からの向かい風です。少し重めのオモリ・ルアーを使うと投げやすくなります。',
      windBlowingToDeg,
      windFromLabel,
      seaFacingLabel,
    };
  }

  return {
    relation: 'crosswind',
    badgeLabel: '横風 △',
    shortStatus: '△',
    description:
      '横から風が当たるため、道糸が膨らむ「糸ふけ」が出やすい状態。竿先を海面に近づけるとアタリが取りやすいよ！',
    windBlowingToDeg,
    windFromLabel,
    seaFacingLabel,
  };
}

export interface WeatherMeta {
  label: string;
  kind: 'clear' | 'partly-cloudy' | 'cloudy' | 'drizzle' | 'rain' | 'heavy-rain' | 'snow' | 'storm';
  isRainy: boolean;
  isStormy: boolean;
}

/** Open-Meteo WMO Weather Code を日本語表示＆分類に変換 */
export function decodeWmoWeather(code: number): WeatherMeta {
  if (code === 0) {
    return { label: '快晴', kind: 'clear', isRainy: false, isStormy: false };
  }
  if (code === 1) {
    return { label: '晴れ', kind: 'clear', isRainy: false, isStormy: false };
  }
  if (code === 2) {
    return { label: '晴れ時々曇り', kind: 'partly-cloudy', isRainy: false, isStormy: false };
  }
  if (code === 3 || code === 45 || code === 48) {
    return { label: code === 3 ? '曇り' : '霧・薄曇り', kind: 'cloudy', isRainy: false, isStormy: false };
  }
  if (code >= 51 && code <= 57) {
    return { label: '霧雨・小雨', kind: 'drizzle', isRainy: true, isStormy: false };
  }
  if (code === 61 || code === 63 || code === 80 || code === 81) {
    return {
      label: code === 61 || code === 80 ? '弱い雨' : '雨',
      kind: 'rain',
      isRainy: true,
      isStormy: false,
    };
  }
  if (code === 65 || code === 66 || code === 67 || code === 82) {
    return { label: '強い雨', kind: 'heavy-rain', isRainy: true, isStormy: code === 82 };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return {
      label: '雪・みぞれ',
      kind: 'snow',
      isRainy: true,
      isStormy: code === 75 || code === 86,
    };
  }
  if (code >= 95) {
    return { label: '雷雨・荒天', kind: 'storm', isRainy: true, isStormy: true };
  }
  return { label: '曇り', kind: 'cloudy', isRainy: false, isStormy: false };
}
