export type ThemeMode = 'night' | 'sunlight';

export type NavTab = 'home' | 'map' | 'gear' | 'log';

export type FishGenreId =
  | 'sabiki'
  | 'bluefish'
  | 'chinu'
  | 'rockfish'
  | 'tachiuo'
  | 'aoriika';

export type SonamaruMood =
  | 'normal'
  | 'excited'
  | 'caution'
  | 'analyzing'
  | 'celebration';

export type TideName = '大潮' | '中潮' | '小潮' | '長潮' | '若潮';

export type TidePhaseState =
  | '上げ潮'
  | '下げ潮'
  | '満潮前後'
  | '干潮前後'
  | '動き出し'
  | '止まりかけ';

export type WindRelation = 'tailwind' | 'crosswind' | 'headwind' | 'calm';

export interface FishingSpot {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  /** 堤防から海に向かって立つ方角（0=北, 90=東, 180=南, 270=西） */
  seaDirectionDeg: number;
  isPreset?: boolean;
  description?: string;
}

export interface HarmonicConstituents {
  /** [振幅(cm), 遅角(deg)] */
  M2: [number, number];
  S2: [number, number];
  K1: [number, number];
  O1: [number, number];
  N2?: [number, number];
  P1?: [number, number];
}

export interface ReferencePort {
  id: string;
  name: string;
  prefecture: string;
  lat: number;
  lon: number;
  /** 平均水面 Z0 (cm) */
  z0: number;
  constituents: HarmonicConstituents;
}

export interface TidePoint {
  hourFloat: number;
  timeLabel: string;
  levelCm: number;
}

export interface TideExtreme {
  type: 'high' | 'low';
  timeStr: string;
  hourFloat: number;
  levelCm: number;
}

export interface HourlyTideInfo {
  hour: number;
  levelCm: number;
  deltaCmPerHour: number;
  /** 0..1 (その港の大潮最大流速に対する相対流速) */
  flowSpeedNormalized: number;
  /** 0..1 (当日の干潮〜満潮レンジ内での相対潮位) */
  levelNormalized: number;
  state: TidePhaseState;
  minutesToNearestSlack: number;
  nearestExtremeType: 'high' | 'low';
}

export interface DailyTideData {
  dateStr: string;
  port: ReferencePort;
  distanceKm: number;
  moonAge: number;
  lunarElongationDeg: number;
  tideName: TideName;
  curve: TidePoint[];
  extremes: TideExtreme[];
  hourly: HourlyTideInfo[];
}

export interface HourlyWeatherPoint {
  hour: number;
  timeIso: string;
  weatherCode: number;
  tempC: number;
  precipProb: number;
  precipMm: number;
  /** 過去24時間の累積降水量 (mm) - past_days=1 から算出 */
  past24hPrecipMm: number;
  /** 風速 (m/s) */
  windSpeedMs: number;
  /** 風向 (0〜360°, 気象庁/WMO基準：風が吹いてくる方角) */
  windDirectionDeg: number;
  pressureHpa: number;
  /** 過去3時間の気圧変化 (hPa) */
  pressureTrend3h: number;
  /** 波高 (m) */
  waveHeightM: number;
  /** 海面水温 (℃) ※参考表示専用・スコア計算には一切不使用 */
  seaSurfaceTempC: number | null;
}

export interface DailyWeatherForecast {
  dateStr: string;
  sunriseStr: string;
  sunsetStr: string;
  sunriseHour: number;
  sunsetHour: number;
  weatherCode: number;
  tempMaxC: number;
  tempMinC: number;
  hourly: HourlyWeatherPoint[];
  /** 参考表示専用の海面水温目安 */
  meanSeaSurfaceTempC: number | null;
}

export interface SpotForecastBundle {
  lat: number;
  lon: number;
  fetchedAt: number;
  source: 'live' | 'cache' | 'estimated';
  days: DailyWeatherForecast[];
}

export interface ReasonTag {
  label: string;
  impact: 'positive' | 'negative' | 'warning';
  detail: string;
  magnitude: number;
}

export interface BeginnerTranslation {
  headline: string;
  timeNote: string;
  tideNote: string;
  weatherNote: string;
  windNote: string;
  nextAction: string;
}

export interface HourlyFishScore {
  hour: number;
  genreId: FishGenreId;
  total: number;
  rawBeforeBreaker: number;
  subScores: {
    time: number;
    tide: number;
    weather: number;
    windWave: number;
    maxTime: number;
    maxTide: number;
    maxWeather: number;
    maxWindWave: number;
  };
  bonusDelta: number;
  safetyWarning: boolean;
  safetyReason?: string;
  /** 根魚ジャンル等の補助バッジ（例: 穴釣り◎ / メバル◎） */
  auxiliaryBadge?: string;
  reasonTags: ReasonTag[];
  translation: BeginnerTranslation;
  sonamaruComment: string;
  sonamaruMood: SonamaruMood;
}

export interface BestTimeWindow {
  startStr: string;
  endStr: string;
  peakScore: number;
  peakHour: number;
  rankSymbol: '◎' | '○' | '△';
  label: string;
}

export interface DailyFishEvaluation {
  genreId: FishGenreId;
  peakScore: number;
  peakHour: number;
  /** 65点以上の上位3魚種にのみ 1 | 2 | 3 が付与される */
  topRankBadge: 1 | 2 | 3 | null;
  bestWindow: BestTimeWindow;
  hourlyScores: HourlyFishScore[];
}

export type GearIconType =
  | 'sinker'
  | 'headlight'
  | 'rainwear'
  | 'sabiki'
  | 'lure'
  | 'cooler'
  | 'lifejacket'
  | 'windbreaker'
  | 'sunscreen'
  | 'gloves'
  | 'net'
  | 'egi'
  | 'float'
  | 'pliers'
  | 'custom';

export interface GearChecklistItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: GearIconType;
  checked: boolean;
  isCustom?: boolean;
  badgeText?: string;
}

export interface CatchLogEntry {
  id: string;
  createdAt: number;
  spotId: string;
  spotName: string;
  dateTimeStr: string;
  genreId: FishGenreId;
  fishName: string;
  sizeCm: number;
  count: number;
  memo: string;
  /** 環境データ自動スナップショット */
  weatherLabel: string;
  weatherCode: number;
  tempC: number;
  windSpeedMs: number;
  windDirLabel: string;
  tideName: TideName;
  tideState: TidePhaseState;
  tideLevelCm: number;
  scoreAtCatch: number;
  /** IndexedDBキー（またはエクスポート時の圧縮DataURL） */
  hasPhoto: boolean;
  photoDataUrl?: string;
}

export interface StrategyPlan {
  source: 'gemini' | 'rule-engine';
  generatedAt: number;
  spotName: string;
  dateStr: string;
  genreName: string;
  headline: string;
  targetTiming: string;
  tackleAndRange: string;
  windAndTideTip: string;
  safetyNote: string;
}

export interface AppSettings {
  theme: ThemeMode;
  geminiApiKey: string;
}

export interface BackupPayload {
  app: 'TsuriPulse';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  mySpots: FishingSpot[];
  gearState: Record<string, GearChecklistItem[]>;
  weatherGearChecked: Record<string, boolean>;
  catchLogs: CatchLogEntry[];
}
