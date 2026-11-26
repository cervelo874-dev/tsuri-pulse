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
  /** 表示ラベル: 追い風 ◎ / 追い風・強め △ / 横風 △ / 向かい風 ✕ / 強風警戒 ✕ 等 */
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
 * 気象の「風向 (windFromDeg: 風が吹いてくる方角)」および「風速 (m/s)」から
 * 風向き判定・注意度バッジ（6.0m/s以上で△注意、9.0m/s以上で✕警戒）と自然な解説文を返す
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

  const baseRelation: WindRelation =
    windSpeedMs < 1.4
      ? 'calm'
      : diff <= 52
      ? 'tailwind'
      : diff >= 128
      ? 'headwind'
      : 'crosswind';

  // 1. 安全ブレーカー基準（9.0m/s以上）：風向きに関わらず赤色の強風警戒（✕）
  if (windSpeedMs >= 9.0) {
    return {
      relation: baseRelation,
      badgeLabel: '強風警戒 ✕',
      shortStatus: '✕',
      description:
        '安全基準を超える非常に強い風です。突風で体勢を崩したりタックルが飛ばされたりする危険があるため、無理な釣行は控えましょう。',
      windBlowingToDeg,
      windFromLabel,
      seaFacingLabel,
    };
  }

  // 2. 微風・凪（1.4m/s未満）
  if (baseRelation === 'calm') {
    return {
      relation: 'calm',
      badgeLabel: '微風・凪 ◎',
      shortStatus: '◎',
      description:
        'ほぼ無風〜そよ風の穏やかな状況です。糸ふけが出にくく、繊細なアタリもしっかり捉えられます。',
      windBlowingToDeg,
      windFromLabel,
      seaFacingLabel,
    };
  }

  // 3. 追い風（背中から海へ向かって吹く風）
  if (baseRelation === 'tailwind') {
    if (windSpeedMs >= 6.0) {
      return {
        relation: 'tailwind',
        badgeLabel: '追い風・強め △',
        shortStatus: '△',
        description:
          '背中からの追い風ですが、風速が強めです。突風で帽子や軽量タックルが飛ばされないよう注意し、足元にも気をつけましょう。',
        windBlowingToDeg,
        windFromLabel,
        seaFacingLabel,
      };
    }

    return {
      relation: 'tailwind',
      badgeLabel: '追い風 ◎',
      shortStatus: '◎',
      description:
        '背中から海へ向かって吹く追い風です。仕掛けやルアーの飛距離が伸びやすく、足元の海面も落ち着きやすい好条件です。',
      windBlowingToDeg,
      windFromLabel,
      seaFacingLabel,
    };
  }

  // 4. 向かい風（海から正面へ吹きつける風）
  if (baseRelation === 'headwind') {
    if (windSpeedMs >= 6.0) {
      return {
        relation: 'headwind',
        badgeLabel: '向かい風・強風 ✕',
        shortStatus: '✕',
        description:
          '正面から強い風が吹きつけています。仕掛けが押し戻されやすく波しぶきも被りやすいため、風裏ポイントへの移動も検討しましょう。',
        windBlowingToDeg,
        windFromLabel,
        seaFacingLabel,
      };
    }

    if (windSpeedMs >= 4.0) {
      return {
        relation: 'headwind',
        badgeLabel: '向かい風 ✕',
        shortStatus: '✕',
        description:
          '海から正面に吹きつける向かい風です。仕掛けが戻されやすいため、少し重めのオモリやルアーを選ぶとキャストしやすくなります。',
        windBlowingToDeg,
        windFromLabel,
        seaFacingLabel,
      };
    }

    return {
      relation: 'headwind',
      badgeLabel: '向かい風 ✕',
      shortStatus: '✕',
      description:
        '正面からの向かい風ですが、風速はまだ控えめです。やや重めの仕掛けを使うと飛距離を保ちやすくなります。',
      windBlowingToDeg,
      windFromLabel,
      seaFacingLabel,
    };
  }

  // 5. 横風（左右から吹き抜ける風）
  if (windSpeedMs >= 6.0) {
    return {
      relation: 'crosswind',
      badgeLabel: '横風・強め △',
      shortStatus: '△',
      description:
        '横からの風が強く、大きな糸ふけが出やすい状況です。オモリを重めにし、突風で道具が飛ばされないよう注意しましょう。',
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
      '横から風が当たるため、道糸が膨らむ「糸ふけ」が出やすい状況です。ティップ（竿先）を水面に近づけるとアタリを取りやすくなります。',
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
