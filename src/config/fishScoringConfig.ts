import { FishGenreId } from '@/types';

export interface FishGenreConfig {
  id: FishGenreId;
  shortName: string;
  fullName: string;
  examples: string;
  accentColor: string;
  /** 4要素の配点比率（合計100点）: 時間帯 / 潮の動き / 天候・過去雨・気圧 / 風・波 */
  weights: {
    time: number;
    tide: number;
    weather: number;
    windWave: number;
  };
  idealWindMaxMs: number;
  penaltyWindMs: number;
  idealWaveRangeM: [number, number];
  maxSafeWaveM: number;
  beginnerTip: string;
}

/**
 * 安全ブレーカー（全魚種共通）閾値
 * 条件該当時は強制的にスコア上限を maxLockedScore (30点) にロックし警告表示
 */
export const SAFETY_BREAKER_CONFIG = {
  maxWindSpeedMs: 9.0,
  maxWaveHeightM: 1.8,
  maxLockedScore: 30,
} as const;

/**
 * ベストタイム自動抽出パラメータ
 */
export const BEST_TIME_CONFIG = {
  highScoreThreshold: 75,
  goodScoreThreshold: 62,
} as const;

/**
 * 第1弾・6ジャンルの配点比率と特性パラメータ
 */
export const FISH_SCORING_CONFIG: Record<FishGenreId, FishGenreConfig> = {
  sabiki: {
    id: 'sabiki',
    shortName: 'サビキ（アジ）',
    fullName: 'サビキ系（アジ等）',
    examples: 'アジ・イワシ・サバ',
    accentColor: '#fbbf24',
    weights: {
      time: 35,
      tide: 30,
      weather: 10,
      windWave: 25,
    },
    idealWindMaxMs: 3.5,
    penaltyWindMs: 5.0,
    idealWaveRangeM: [0.1, 0.6],
    maxSafeWaveM: 1.0,
    beginnerTip:
      'アミエビの煙幕に群れを寄せる釣りです。朝夕マズメに潮が程よく動くタイミングが最大のチャンスになります。',
  },

  bluefish: {
    id: 'bluefish',
    shortName: '青物・サゴシ',
    fullName: '青物・サゴシ',
    examples: 'ツバス・ハマチ・サゴシ',
    accentColor: '#22d3ee',
    weights: {
      time: 40,
      tide: 35,
      weather: 10,
      windWave: 15,
    },
    idealWindMaxMs: 5.0,
    penaltyWindMs: 6.0,
    idealWaveRangeM: [0.3, 0.85],
    maxSafeWaveM: 1.3,
    beginnerTip:
      '朝マズメの回遊と潮がしっかり走る時間帯が最優先です。追い風ならメタルジグの飛距離が伸びて有利になります。',
  },

  chinu: {
    id: 'chinu',
    shortName: 'チヌ・メジナ',
    fullName: 'チヌ・メジナ',
    examples: 'クロダイ・グレ・キビレ',
    accentColor: '#a78bfa',
    weights: {
      time: 15,
      tide: 30,
      weather: 25,
      windWave: 30,
    },
    idealWindMaxMs: 4.0,
    penaltyWindMs: 5.5,
    idealWaveRangeM: [0.4, 0.9],
    maxSafeWaveM: 1.2,
    beginnerTip:
      '警戒心の強い魚なので、快晴ベタ凪よりも「曇り・適度な波気・ほんのり笹濁り」がある日中に好機が生まれます。',
  },

  rockfish: {
    id: 'rockfish',
    shortName: '根魚（ガシラ）',
    fullName: '根魚（ガシラ・メバル）',
    examples: 'ガシラ(カサゴ)・メバル・アコウ',
    accentColor: '#fb7185',
    weights: {
      time: 30,
      tide: 20,
      weather: 15,
      windWave: 35,
    },
    idealWindMaxMs: 2.5,
    penaltyWindMs: 4.0,
    idealWaveRangeM: [0.05, 0.55],
    maxSafeWaveM: 1.0,
    beginnerTip:
      '軽量リグを繊細に操作するため、風の弱さが重要です。日中の干潮前後はテトラや壁際の穴釣り、夜の満潮前後はメバルの浮上が狙い目です。',
  },

  tachiuo: {
    id: 'tachiuo',
    shortName: 'タチウオ',
    fullName: 'タチウオ',
    examples: 'タチウオ（ワインド・テンヤ・ウキ）',
    accentColor: '#38bdf8',
    weights: {
      time: 45,
      tide: 25,
      weather: 10,
      windWave: 20,
    },
    idealWindMaxMs: 3.5,
    penaltyWindMs: 5.0,
    idealWaveRangeM: [0.1, 0.65],
    maxSafeWaveM: 1.1,
    beginnerTip:
      '夕マズメの時合いから夜前半、そして夜明け前が勝負です。新月周りの暗い夜はベイトとタチウオが接岸しやすくなります。',
  },

  aoriika: {
    id: 'aoriika',
    shortName: 'アオリイカ',
    fullName: 'アオリイカ',
    examples: 'アオリイカ・コウイカ（エギング）',
    accentColor: '#34d399',
    weights: {
      time: 30,
      tide: 30,
      weather: 15,
      windWave: 25,
    },
    idealWindMaxMs: 3.0,
    penaltyWindMs: 4.0,
    idealWaveRangeM: [0.1, 0.6],
    maxSafeWaveM: 1.0,
    beginnerTip:
      'エギングは横風・向かい風と大雨後の水潮（真水）が大敵です。微風の朝夕マズメや、潮の動き出し・止まりかけを重点的に狙いましょう。',
  },
};

export const FISH_GENRE_LIST: FishGenreConfig[] = [
  FISH_SCORING_CONFIG.sabiki,
  FISH_SCORING_CONFIG.bluefish,
  FISH_SCORING_CONFIG.chinu,
  FISH_SCORING_CONFIG.rockfish,
  FISH_SCORING_CONFIG.tachiuo,
  FISH_SCORING_CONFIG.aoriika,
];
