import {
  BEST_TIME_CONFIG,
  FISH_GENRE_LIST,
  FISH_SCORING_CONFIG,
  SAFETY_BREAKER_CONFIG,
} from '@/config/fishScoringConfig';
import { decodeWmoWeather, evaluateWindRelation } from '@/lib/windUtils';
import {
  BeginnerTranslation,
  BestTimeWindow,
  DailyFishEvaluation,
  DailyTideData,
  DailyWeatherForecast,
  FishGenreId,
  FishingSpot,
  HourlyFishScore,
  HourlyTideInfo,
  HourlyWeatherPoint,
  ReasonTag,
  SonamaruMood,
} from '@/types';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

interface TimeLightContext {
  isMorningMazume: boolean;
  isEveningMazume: boolean;
  isPreDawn: boolean;
  isEarlyNight: boolean; // 日没後〜22時頃
  isDeepNight: boolean;
  isDaytime: boolean;
}

function analyzeTimeContext(
  hour: number,
  sunriseHour: number,
  sunsetHour: number
): TimeLightContext {
  const hCenter = hour + 0.5;
  const diffSunrise = hCenter - sunriseHour;
  const diffSunset = hCenter - sunsetHour;

  const isMorningMazume = diffSunrise >= -1.0 && diffSunrise <= 1.7;
  const isPreDawn = diffSunrise >= -2.2 && diffSunrise < -1.0;
  const isEveningMazume = diffSunset >= -1.3 && diffSunset <= 1.1;
  const isEarlyNight = diffSunset > 1.1 && hCenter <= 22.5;
  const isDaytime =
    !isMorningMazume &&
    !isEveningMazume &&
    hCenter > sunriseHour + 1.7 &&
    hCenter < sunsetHour - 1.3;
  const isDeepNight =
    !isMorningMazume &&
    !isPreDawn &&
    !isEveningMazume &&
    !isEarlyNight &&
    !isDaytime;

  return {
    isMorningMazume,
    isEveningMazume,
    isPreDawn,
    isEarlyNight,
    isDeepNight,
    isDaytime,
  };
}

/**
 * 特定魚種・特定1時間のスコア・理由タグ・初心者通訳・ソナまるコメントを精密算出
 * ※海面水温(seaSurfaceTempC)は仕様通りスコア計算に一切使用しない
 */
export function evaluateHourlyFishScore(
  genreId: FishGenreId,
  hour: number,
  weather: HourlyWeatherPoint,
  dailyWeather: DailyWeatherForecast,
  tide: HourlyTideInfo,
  dailyTide: DailyTideData,
  spot: FishingSpot
): HourlyFishScore {
  const cfg = FISH_SCORING_CONFIG[genreId];
  const w = cfg.weights;
  const tc = analyzeTimeContext(hour, dailyWeather.sunriseHour, dailyWeather.sunsetHour);
  const wmo = decodeWmoWeather(weather.weatherCode);
  const windJudge = evaluateWindRelation(
    weather.windDirectionDeg,
    weather.windSpeedMs,
    spot.seaDirectionDeg
  );

  const reasons: ReasonTag[] = [];
  let timeRatio = 0.55;
  let tideRatio = 0.55;
  let weatherRatio = 0.65;
  let windRatio = 0.65;
  let bonusDelta = 0;
  let auxiliaryBadge: string | undefined;

  const isSpringOrModTide =
    dailyTide.tideName === '大潮' || dailyTide.tideName === '中潮';
  const isSlackTide = tide.minutesToNearestSlack <= 30;
  const isNewMoonAround = dailyTide.moonAge <= 2.5 || dailyTide.moonAge >= 27.0;
  const isFullMoonAround = dailyTide.moonAge >= 13.0 && dailyTide.moonAge <= 16.5;

  // =====================================================
  // ジャンル別の4要素評価 + ボーナス・ペナルティ
  // =====================================================
  switch (genreId) {
    case 'sabiki': {
      // 1. 時間帯 (35)
      if (tc.isMorningMazume || tc.isEveningMazume) {
        timeRatio = 0.96;
        reasons.push({
          label: tc.isMorningMazume ? '朝マズメ◎' : '夕マズメ◎',
          impact: 'positive',
          detail: 'プランクトンと小魚の活性が一気に上がるゴールデンタイムです。',
          magnitude: 9,
        });
      } else if (tc.isDaytime) {
        timeRatio = 0.62;
      } else if (tc.isEarlyNight || tc.isPreDawn) {
        timeRatio = 0.52;
      } else {
        timeRatio = 0.36;
      }

      // 2. 潮の動き (30)
      if (isSlackTide) {
        tideRatio = 0.32;
        bonusDelta -= 4;
        reasons.push({
          label: '潮止まり前後',
          impact: 'negative',
          detail: '満干潮前後は潮が緩み、回遊魚の群れが一時的に落ち着きやすい時間帯です。',
          magnitude: 7,
        });
      } else if (
        isSpringOrModTide &&
        tide.flowSpeedNormalized >= 0.35 &&
        tide.flowSpeedNormalized <= 0.88
      ) {
        tideRatio = 0.94;
        reasons.push({
          label: `${dailyTide.tideName}×程よい潮流`,
          impact: 'positive',
          detail: 'コマセ（アミエビ）が綺麗に漂い、アジ・イワシが回遊しやすい理想的な流れです。',
          magnitude: 8,
        });
      } else if (tide.state === '動き出し') {
        tideRatio = 0.86;
        reasons.push({
          label: '潮の動き出し◎',
          impact: 'positive',
          detail: '止まっていた潮が動き始め、魚の活性が上がる好タイミングです。',
          magnitude: 6,
        });
      } else {
        tideRatio = 0.66;
      }

      // 3. 天候・過去雨 (10)
      if (wmo.kind === 'cloudy' || wmo.kind === 'partly-cloudy') {
        weatherRatio = 0.92;
        reasons.push({
          label: 'ローライト好天',
          impact: 'positive',
          detail: '曇り空で魚の警戒心が薄れ、日中も浅いタナまで浮きやすい空模様です。',
          magnitude: 4,
        });
      } else if (wmo.kind === 'clear') {
        weatherRatio = 0.75;
      } else if (wmo.kind === 'heavy-rain' || weather.past24hPrecipMm >= 20) {
        weatherRatio = 0.3;
        bonusDelta -= 4;
      } else if (wmo.isRainy) {
        weatherRatio = 0.48;
      }

      // 4. 風・波 (25)
      if (weather.windSpeedMs <= 3.2 && weather.waveHeightM <= 0.55) {
        windRatio = 0.95;
        reasons.push({
          label: windJudge.relation === 'tailwind' ? '穏やかな追い風◎' : '穏やかな海況◎',
          impact: 'positive',
          detail: '風・波ともに穏やかで、竿先（ティップ）に出るアタリが分かりやすい状況です。',
          magnitude: 7,
        });
      } else if (weather.windSpeedMs >= 5.0 || weather.waveHeightM >= 1.0) {
        windRatio = 0.28;
        bonusDelta -= 6;
        reasons.push({
          label: '強風・波に注意',
          impact: 'negative',
          detail: `風速${weather.windSpeedMs}m/sのため、軽いサビキ仕掛けが流されやすい状況です。`,
          magnitude: 8,
        });
      } else {
        windRatio = windJudge.relation === 'tailwind' ? 0.84 : windJudge.relation === 'headwind' ? 0.52 : 0.68;
      }
      break;
    }

    case 'bluefish': {
      // 1. 時間帯 (40) - 朝マズメ最重視・完全な夜間は大幅減点
      if (tc.isMorningMazume) {
        timeRatio = 1.0;
        bonusDelta += 4;
        reasons.push({
          label: '朝マズメ最盛期🔥',
          impact: 'positive',
          detail: '青物・サゴシがベイトを追い回す、1日で最も期待できる時間帯です。',
          magnitude: 10,
        });
      } else if (tc.isEveningMazume) {
        timeRatio = 0.84;
        reasons.push({
          label: '夕マズメ回遊◎',
          impact: 'positive',
          detail: '日没前に再びベイトが接岸し、ナブラやボイルが出やすい時間帯です。',
          magnitude: 7,
        });
      } else if (tc.isPreDawn) {
        timeRatio = 0.66;
      } else if (tc.isDaytime) {
        timeRatio = 0.58;
      } else {
        timeRatio = 0.12;
        bonusDelta -= 12;
        reasons.push({
          label: '夜間は青物オフ時間',
          impact: 'negative',
          detail: '青物は視覚でベイトを追うため、真っ暗な夜間は回遊がほぼ止まります。',
          magnitude: 9,
        });
      }

      // 2. 潮の動き (35) - 大潮〜中潮の流速ピーク◎、ド干潮減点
      if (tide.levelNormalized <= 0.15 && isSlackTide) {
        tideRatio = 0.24;
        bonusDelta -= 6;
        reasons.push({
          label: 'ド干潮・潮止まり',
          impact: 'negative',
          detail: '水深が浅くなり潮流も緩むため、回遊魚が沖へ離れやすいタイミングです。',
          magnitude: 7,
        });
      } else if (isSpringOrModTide && tide.flowSpeedNormalized >= 0.55) {
        tideRatio = 0.96;
        reasons.push({
          label: `${dailyTide.tideName}の急潮流◎`,
          impact: 'positive',
          detail: '潮がしっかり効いてベイトが動き、青物の捕食スイッチが入りやすい状況です。',
          magnitude: 9,
        });
      } else if (tide.flowSpeedNormalized >= 0.35) {
        tideRatio = 0.78;
      } else {
        tideRatio = 0.45;
      }

      // 3. 天候・過去24h雨 (10)
      if (weather.past24hPrecipMm >= 20) {
        weatherRatio = 0.2;
        bonusDelta -= 8;
        reasons.push({
          label: '大雨後の泥濁り懸念',
          impact: 'negative',
          detail: `過去24時間の雨量が${weather.past24hPrecipMm}mmあり、強い濁りや漂流ゴミに注意が必要です。`,
          magnitude: 8,
        });
      } else if (weather.past24hPrecipMm >= 1 && weather.past24hPrecipMm <= 10 && !wmo.isStormy) {
        weatherRatio = 0.96;
        bonusDelta += 3;
        reasons.push({
          label: '程よい濁りで好条件◎',
          impact: 'positive',
          detail: '少量の雨による適度な笹濁りで、ルアーが見切られにくい好条件です。',
          magnitude: 5,
        });
      } else if (wmo.kind === 'cloudy' || wmo.kind === 'partly-cloudy') {
        weatherRatio = 0.88;
      } else {
        weatherRatio = wmo.isRainy ? 0.52 : 0.76;
      }

      // 4. 風・波 (15)
      if (windJudge.relation === 'headwind' && weather.windSpeedMs >= 6.0) {
        windRatio = 0.2;
        bonusDelta -= 8;
        reasons.push({
          label: '強い向かい風✕',
          impact: 'negative',
          detail: '正面からの強風でメタルジグの飛距離が落ちやすく、波しぶきにも注意が必要です。',
          magnitude: 7,
        });
      } else if (
        windJudge.relation === 'tailwind' &&
        weather.windSpeedMs < 6.0 &&
        weather.waveHeightM <= 1.0
      ) {
        windRatio = 0.96;
        bonusDelta += 3;
        reasons.push({
          label: '追い風ロングキャスト◎',
          impact: 'positive',
          detail: '追い風に乗ってルアーを沖の潮目まで遠投しやすいチャンスです。',
          magnitude: 6,
        });
      } else if (weather.waveHeightM >= 0.3 && weather.waveHeightM <= 0.85 && weather.windSpeedMs < 6.0) {
        windRatio = 0.86;
        reasons.push({
          label: '適度な波気◎',
          impact: 'positive',
          detail: '海面が適度にざわつき、青物の活性が上がりやすい状況です。',
          magnitude: 5,
        });
      } else {
        windRatio = weather.windSpeedMs >= 6.5 ? 0.35 : 0.68;
      }
      break;
    }

    case 'chinu': {
      // 1. 時間帯 (15)
      if (tc.isMorningMazume || tc.isEveningMazume) {
        timeRatio = 0.94;
      } else if (tc.isDaytime) {
        timeRatio = 0.82;
      } else if (tc.isEarlyNight) {
        timeRatio = 0.74;
      } else {
        timeRatio = 0.56;
      }

      // 2. 潮の動き (30)
      if (dailyTide.tideName === '中潮' && tide.flowSpeedNormalized >= 0.25 && tide.flowSpeedNormalized <= 0.75) {
        tideRatio = 0.95;
        reasons.push({
          label: '中潮の安定した流れ◎',
          impact: 'positive',
          detail: '速すぎず遅すぎない安定した潮流で、撒き餌と仕掛けを同調させやすい潮回りです。',
          magnitude: 8,
        });
      } else if (tide.flowSpeedNormalized >= 0.2 && !isSlackTide) {
        tideRatio = 0.82;
      } else {
        tideRatio = 0.48;
      }

      // 3. 天候・過去雨・気圧 (25)
      const isFallingPressure = weather.pressureTrend3h <= -0.8;
      if (weather.past24hPrecipMm >= 22) {
        weatherRatio = 0.32;
        bonusDelta -= 6;
        reasons.push({
          label: '大雨後の大量真水',
          impact: 'negative',
          detail: '表層に冷たい真水が多く入っているため、底付近をじっくり探る工夫が必要です。',
          magnitude: 7,
        });
      } else if (
        wmo.kind === 'cloudy' ||
        wmo.kind === 'drizzle' ||
        isFallingPressure
      ) {
        weatherRatio = 0.94;
        if (isFallingPressure) bonusDelta += 3;
        reasons.push({
          label: isFallingPressure ? '気圧低下×ローライト◎' : '警戒心が薄れる曇天◎',
          impact: 'positive',
          detail: '光量が抑えられ気圧も低下傾向のため、警戒心の強いチヌ・メジナが浮きやすい好条件です。',
          magnitude: 8,
        });
      } else if (wmo.kind === 'clear' && weather.waveHeightM < 0.2 && weather.windSpeedMs < 1.5) {
        weatherRatio = 0.42;
        bonusDelta -= 5;
        reasons.push({
          label: '快晴×ベタ凪で見切られ注意',
          impact: 'negative',
          detail: '海が澄んで穏やかなため魚の警戒心が高めです。ハリスを細くし、際から一歩下がって構えましょう。',
          magnitude: 6,
        });
      } else {
        weatherRatio = 0.72;
      }

      // 4. 風・波 (30)
      if (weather.waveHeightM >= 1.2 || weather.windSpeedMs >= 6.0) {
        windRatio = 0.26;
        bonusDelta -= 6;
        reasons.push({
          label: '強風・高波でウキ操作難',
          impact: 'negative',
          detail: '波風が強めでウキやラインメンディングが難しく、足元の波にも注意が必要です。',
          magnitude: 8,
        });
      } else if (windJudge.relation === 'crosswind' && weather.windSpeedMs >= 4.0) {
        windRatio = 0.44;
        reasons.push({
          label: '横風で糸ふけ注意△',
          impact: 'negative',
          detail: '横風で道糸が取られやすいため、水中ウキやガン玉を活用してラインを馴染ませましょう。',
          magnitude: 6,
        });
      } else if (weather.waveHeightM >= 0.35 && weather.waveHeightM <= 0.9 && weather.windSpeedMs <= 4.2) {
        windRatio = 0.94;
        reasons.push({
          label: '適度な波気で活性UP◎',
          impact: 'positive',
          detail: `波高${weather.waveHeightM}mの程よいざわつきが、チヌ・メジナの警戒心を和らげてくれます。`,
          magnitude: 7,
        });
      } else {
        windRatio = 0.74;
      }
      break;
    }

    case 'rockfish': {
      const isNightish = !tc.isDaytime;
      if (isNightish && (tide.state === '満潮前後' || tide.levelNormalized >= 0.65)) {
        auxiliaryBadge = 'メバル◎';
      } else if (tide.state === '干潮前後' || tide.levelNormalized <= 0.34) {
        auxiliaryBadge = '穴釣り◎';
      }

      // 1. 時間帯 (30)
      if (tc.isEveningMazume || tc.isEarlyNight || tc.isMorningMazume) {
        timeRatio = 0.95;
        reasons.push({
          label: tc.isDaytime ? '根魚時合い' : '夕〜夜の根魚ゴールデンタイム◎',
          impact: 'positive',
          detail: '薄暗くなるとガシラやメバルがシモリや壁際から出て、活発にエサを探し始めます。',
          magnitude: 8,
        });
      } else if (tc.isDeepNight || tc.isPreDawn) {
        timeRatio = 0.84;
      } else {
        timeRatio = tide.levelNormalized <= 0.4 ? 0.74 : 0.64;
        if (auxiliaryBadge === '穴釣り◎') {
          reasons.push({
            label: '日中の穴釣り好機◎',
            impact: 'positive',
            detail: '干潮前後は岩陰やテトラの隙間に潜むガシラへ、ブラクリを直撃させやすい好機です。',
            magnitude: 6,
          });
        }
      }

      // 2. 潮の動き (20)
      if (tide.flowSpeedNormalized <= 0.55 && tide.flowSpeedNormalized >= 0.12) {
        tideRatio = 0.92;
      } else if (tide.flowSpeedNormalized > 0.78) {
        tideRatio = 0.52;
      } else {
        tideRatio = 0.76;
      }
      if (auxiliaryBadge === 'メバル◎') {
        tideRatio = Math.max(tideRatio, 0.92);
        reasons.push({
          label: '夜の満潮×メバル浮上◎',
          impact: 'positive',
          detail: '潮位が高く、常夜灯周りの表層〜中層にメバルが浮きやすい絶好のタイミングです。',
          magnitude: 7,
        });
      }

      // 3. 天候 (15)
      if (!wmo.isRainy) {
        weatherRatio = wmo.kind === 'cloudy' ? 0.92 : 0.84;
      } else if (wmo.kind === 'drizzle') {
        weatherRatio = 0.62;
      } else {
        weatherRatio = 0.35;
      }

      // 4. 風・波 (35)
      if (weather.windSpeedMs <= 2.5 && weather.waveHeightM < 0.6) {
        windRatio = 0.98;
        bonusDelta += 2;
        reasons.push({
          label: '微風ベタ凪で感度抜群◎',
          impact: 'positive',
          detail: `風速${weather.windSpeedMs}m/sの微風のため、1〜2gの軽量ジグヘッドでも繊細なアタリが明確に伝わります。`,
          magnitude: 9,
        });
      } else if (weather.windSpeedMs >= 4.0 || weather.waveHeightM >= 1.0) {
        windRatio = 0.24;
        bonusDelta -= 7;
        reasons.push({
          label: '風・波で軽量リグ操作難',
          impact: 'negative',
          detail: '風速4m/sを超えると軽量リグが浮き上がりやすいため、重めのブラクリ等で足元を探りましょう。',
          magnitude: 9,
        });
      } else {
        windRatio = 0.72;
      }
      break;
    }

    case 'tachiuo': {
      // 1. 時間帯 (45)
      if (tc.isEveningMazume) {
        timeRatio = 1.0;
        bonusDelta += 4;
        reasons.push({
          label: '夕マズメのタチウオ時合い🔥',
          impact: 'positive',
          detail: '薄暗くなる夕マズメは、タチウオが浅ダナまで一気に浮上する最大のチャンスタイムです。',
          magnitude: 10,
        });
      } else if (tc.isEarlyNight || tc.isPreDawn) {
        timeRatio = 0.92;
        reasons.push({
          label: tc.isPreDawn ? '夜明け前の時合い◎' : '夜前半の回遊タイム◎',
          impact: 'positive',
          detail: '電気ウキ・テンヤ・ワインドでじっくりタチウオの回遊を狙える好時間帯です。',
          magnitude: 8,
        });
      } else if (tc.isDeepNight) {
        timeRatio = 0.72;
      } else if (tc.isMorningMazume) {
        timeRatio = 0.62;
      } else {
        timeRatio = 0.14;
        bonusDelta -= 12;
        reasons.push({
          label: '日中は深場へ移動中',
          impact: 'negative',
          detail: '明るい時間帯、堤防周りのタチウオは沖の深場へ落ちているため夕方以降が本番になります。',
          magnitude: 10,
        });
      }

      // 2. 潮の動き (25)
      if (tide.state === '動き出し' || (tide.flowSpeedNormalized >= 0.25 && tide.flowSpeedNormalized <= 0.75)) {
        tideRatio = 0.92;
        if (!tc.isDaytime) {
          reasons.push({
            label: tide.state === '動き出し' ? '潮の動き出しで回遊開始◎' : '程よい潮流◎',
            impact: 'positive',
            detail: '潮が程よく効いてベイトが溜まり、タチウオの群れが回遊してきやすい状況です。',
            magnitude: 7,
          });
        }
      } else if (isSlackTide) {
        tideRatio = 0.45;
      } else {
        tideRatio = 0.68;
      }

      // 3. 天候・月齢ボーナス (10)
      if (isNewMoonAround && !tc.isDaytime) {
        weatherRatio = 0.95;
        bonusDelta += 3;
        reasons.push({
          label: '新月周りの闇夜ボーナス(+3)',
          impact: 'positive',
          detail: '月明かりが少なく、常夜灯やケミホタルの光にベイトとタチウオが集まりやすい夜です。',
          magnitude: 6,
        });
      } else if (isFullMoonAround && wmo.kind === 'clear' && !tc.isDaytime) {
        weatherRatio = 0.48;
        bonusDelta -= 3;
        reasons.push({
          label: '満月×快晴で群れ散り注意(-3)',
          impact: 'negative',
          detail: '月明かりが強い夜はベイトが広範囲に散りやすいため、普段より少し深めのタナを探りましょう。',
          magnitude: 5,
        });
      } else {
        weatherRatio = wmo.isRainy ? 0.45 : 0.82;
      }

      // 4. 風・波 (20)
      if (weather.windSpeedMs <= 3.2 && weather.waveHeightM <= 0.6) {
        windRatio = 0.94;
        if (!tc.isDaytime) {
          reasons.push({
            label: '穏やかな凪でアタリ明確◎',
            impact: 'positive',
            detail: '海面が穏やかなため、ウキの変化やティップに出る繊細な前アタリをしっかり捉えられます。',
            magnitude: 6,
          });
        }
      } else if (weather.windSpeedMs >= 5.0 || weather.waveHeightM >= 1.1) {
        windRatio = 0.3;
        bonusDelta -= 5;
        reasons.push({
          label: '強風・うねり注意',
          impact: 'negative',
          detail: '風波でテンヤやウキが浮き上がりやすいため、オモリ負荷を1ランク上げると安定します。',
          magnitude: 7,
        });
      } else {
        windRatio = 0.7;
      }
      break;
    }

    case 'aoriika': {
      // 1. 時間帯 (30)
      if (tc.isMorningMazume || tc.isEveningMazume) {
        timeRatio = 0.96;
        reasons.push({
          label: tc.isMorningMazume ? '朝マズメのシャロー接岸◎' : '夕マズメの捕食タイム◎',
          impact: 'positive',
          detail: '光量が変化するマズメ時は、アオリイカがシャロー（浅場）へベイトを追い込む絶好機です。',
          magnitude: 8,
        });
      } else if (tc.isEarlyNight || tc.isDeepNight) {
        timeRatio = 0.82;
      } else {
        timeRatio = tide.state === '動き出し' || tide.state === '止まりかけ' ? 0.78 : 0.62;
      }

      // 2. 潮の動き (30)
      if (
        isSpringOrModTide &&
        (tide.state === '動き出し' || tide.state === '止まりかけ')
      ) {
        tideRatio = 0.98;
        bonusDelta += 2;
        reasons.push({
          label: `${dailyTide.tideName}の潮変わり（${tide.state}）◎`,
          impact: 'positive',
          detail: '潮流の速さが変化するタイミングは、アオリイカがエギを抱きやすい好機です。',
          magnitude: 9,
        });
      } else if (tide.flowSpeedNormalized >= 0.2 && tide.flowSpeedNormalized <= 0.75) {
        tideRatio = 0.84;
      } else {
        tideRatio = 0.56;
      }

      // 3. 天候・過去24h雨・月齢 (15)
      if (weather.past24hPrecipMm >= 15) {
        weatherRatio = 0.12;
        bonusDelta -= 14;
        reasons.push({
          label: '大雨後の水潮（真水）警戒✕',
          impact: 'negative',
          detail: `過去24時間の雨量が${weather.past24hPrecipMm}mmあります。アオリイカは真水による塩分低下を嫌うため、潮通しの良い外向きを選びましょう。`,
          magnitude: 10,
        });
      } else if (wmo.kind === 'rain' || wmo.kind === 'heavy-rain') {
        weatherRatio = 0.25;
        bonusDelta -= 7;
        reasons.push({
          label: '本降りの雨で表層塩分低下',
          impact: 'negative',
          detail: '雨で海面付近の塩分濃度が下がりやすいため、ボトム付近を中心に丁寧に探りましょう。',
          magnitude: 7,
        });
      } else if (!tc.isDaytime && isFullMoonAround && wmo.kind !== 'cloudy') {
        weatherRatio = 0.96;
        bonusDelta += 3;
        reasons.push({
          label: '夜の満月周りボーナス(+3)',
          impact: 'positive',
          detail: '月明かりでエギのシルエットが浮かび上がり、ナイトエギングに好適な夜です。',
          magnitude: 7,
        });
      } else {
        weatherRatio = 0.85;
      }

      // 4. 風・波 (25)
      if (weather.windSpeedMs <= 2.8 && weather.waveHeightM <= 0.55) {
        windRatio = 0.97;
        reasons.push({
          label: 'エギング日和の微風◎',
          impact: 'positive',
          detail: 'PEラインが風に流されにくく、エギのフォール姿勢の安定とアタリ取りに最適な微風です。',
          magnitude: 8,
        });
      } else if (
        weather.windSpeedMs >= 4.0 &&
        (windJudge.relation === 'crosswind' || windJudge.relation === 'headwind')
      ) {
        windRatio = 0.18;
        bonusDelta -= 10;
        reasons.push({
          label: `風速${weather.windSpeedMs}m/sでライン煽られ注意`,
          impact: 'negative',
          detail: '横風・向かい風でPEラインが膨らみやすい状況です。ティップを水面に近づけるか、風裏ポイントへ移動しましょう。',
          magnitude: 9,
        });
      } else if (weather.windSpeedMs >= 4.5) {
        windRatio = 0.42;
        bonusDelta -= 4;
      } else {
        windRatio = windJudge.relation === 'tailwind' ? 0.86 : 0.7;
      }
      break;
    }
  }

  const subTime = Math.round(w.time * clamp(timeRatio, 0, 1));
  const subTide = Math.round(w.tide * clamp(tideRatio, 0, 1));
  const subWeather = Math.round(w.weather * clamp(weatherRatio, 0, 1));
  const subWindWave = Math.round(w.windWave * clamp(windRatio, 0, 1));

  const rawScore = clamp(
    subTime + subTide + subWeather + subWindWave + bonusDelta,
    0,
    100
  );

  // =====================================================
  // 安全ブレーカー（全魚種共通）
  // =====================================================
  let safetyWarning = false;
  let safetyReason: string | undefined;
  let finalScore = rawScore;

  if (
    weather.windSpeedMs >= SAFETY_BREAKER_CONFIG.maxWindSpeedMs ||
    weather.waveHeightM >= SAFETY_BREAKER_CONFIG.maxWaveHeightM ||
    wmo.isStormy
  ) {
    safetyWarning = true;
    finalScore = Math.min(rawScore, SAFETY_BREAKER_CONFIG.maxLockedScore);
    const causes: string[] = [];
    if (weather.windSpeedMs >= SAFETY_BREAKER_CONFIG.maxWindSpeedMs) {
      causes.push(`強風(${weather.windSpeedMs}m/s)`);
    }
    if (weather.waveHeightM >= SAFETY_BREAKER_CONFIG.maxWaveHeightM) {
      causes.push(`高波(${weather.waveHeightM}m)`);
    }
    if (wmo.isStormy) {
      causes.push(wmo.label);
    }
    safetyReason = `${causes.join('・')}のため安全ブレーカーが作動しています（上限30点ロック）`;
    reasons.unshift({
      label: `⚠️ 安全警戒：${causes.join('・')}`,
      impact: 'warning',
      detail: '堤防での高波や突風は大変危険です。無理な釣行は控え、穏やかな日や時間帯を選びましょう。',
      magnitude: 100,
    });
  }

  // 影響度の大きい順に上位3件の理由タグを選出
  const topReasons = reasons
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 3);

  if (topReasons.length === 0) {
    topReasons.push({
      label: `${dailyTide.tideName}・${tide.state}`,
      impact: 'positive',
      detail: '大きな悪条件はなく、基本通りにタナと潮目を意識すれば十分に狙えるコンディションです。',
      magnitude: 3,
    });
  }

  // ソナまるの表情判定（全8表情対応：警戒・爆釣・マズメ点火・おやすみ・通常）
  let sonamaruMood: SonamaruMood = 'normal';
  if (
    safetyWarning ||
    weather.windSpeedMs >= 5.0 ||
    (wmo.isRainy && (weather.precipMm >= 0.5 || weather.precipProb >= 55))
  ) {
    sonamaruMood = 'caution';
  } else if (finalScore >= 80) {
    sonamaruMood = 'excited';
  } else if ((tc.isMorningMazume || tc.isEveningMazume) && finalScore >= 62) {
    sonamaruMood = 'mazume';
  } else if (finalScore <= 44) {
    sonamaruMood = 'sleepy';
  } else {
    sonamaruMood = 'normal';
  }

  // ソナまるの1〜2行ルールベース吹き出し（ここだけ元気なキャラ口調に統一）
  let sonamaruComment: string;
  if (safetyWarning) {
    sonamaruComment = `ピピッ⚠️ ${safetyReason?.split('のため')[0]}で危険だよ！安全第一で無理しないでねっ！`;
  } else if (sonamaruMood === 'caution') {
    sonamaruComment =
      weather.windSpeedMs >= 5.0
        ? `ピピッ！風が${weather.windSpeedMs}m/sあるよ。風裏を選ぶか重めの仕掛けで安全にね！`
        : `ピピッ☔ 雨が降りそうだよ！レインウェアと足元の滑り止めで安全対策してね！`;
  } else if (finalScore >= 80) {
    sonamaruComment = `ピピッ✨ 激アツ${finalScore}点！${topReasons[0].label}で${cfg.shortName}の大チャンスだよっ！`;
  } else if (sonamaruMood === 'mazume') {
    sonamaruComment = `ピピッ🔥 マズメの時合い突入！${topReasons[0].label}で集中タイムだよっ！`;
  } else if (finalScore >= 65) {
    sonamaruComment = `ピピッ♪ ${topReasons[0].label}で好調だよ！時合いを逃さず狙ってみようっ！`;
  } else if (finalScore >= 45) {
    sonamaruComment = `ピピッ！この時間は${tide.state}で落ち着き気味かな。タイドグラフで狙い目時間も見てみてね！`;
  } else {
    sonamaruComment = `ピピッ💤 今は${topReasons[0].label}でお魚もお休みモード…好調な他魚種か別時間をチェックしよう〜`;
  }

  // 初心者通訳パネルのテキスト構築（すべて自然な「です・ます調」に統一）
  const translation: BeginnerTranslation = {
    headline: safetyWarning
      ? `⚠️ 安全最優先：${safetyReason}`
      : finalScore >= 80
      ? '条件がしっかり噛み合った、大チャンスの時間帯です。'
      : finalScore >= 65
      ? '十分に釣果が期待できる好コンディションです。'
      : finalScore >= 45
      ? 'まずまずの状況です。タナ調整や潮の変化を意識すると釣果につながります。'
      : '少し渋めの時間帯です。時合いを待つか、好調な他魚種を狙うのが効率的です。',
    timeNote: tc.isMorningMazume
      ? '日の出前後の「朝マズメ」にあたり、ベイトから本命まで活性が最も高まるゴールデンタイムです。'
      : tc.isEveningMazume
      ? '日の入り前後の「夕マズメ」にあたり、薄暗くなることで魚の警戒心が解けて接岸しやすくなります。'
      : tc.isDaytime
      ? `日中の明るい時間帯です（日の出 ${dailyWeather.sunriseStr} ／ 日の入り ${dailyWeather.sunsetStr}）。魚は深場やシェード・ボトム付近に落ち着きやすくなります。`
      : '夜間の時間帯です。タチウオやメバル・ガシラなどの夜行性ターゲットには有利ですが、青物の回遊は止まります。',
    tideNote: `潮回りは「${dailyTide.tideName}（月齢${dailyTide.moonAge}）」で、${hour}時時点は「${tide.state}（潮位${tide.levelCm}cm）」です。${
      isSlackTide
        ? '満干潮前後の潮止まりにあたるため、次の「動き出し」が狙い目になります。'
        : '潮が動いて海中に酸素やベイトが運ばれているため、魚のやる気が上がりやすい状態です。'
    }`,
    weatherNote: `天候は「${wmo.label}（気温${weather.tempC}℃・降水確率${weather.precipProb}%）」です。過去24時間の雨量は ${weather.past24hPrecipMm}mm ${
      weather.past24hPrecipMm === 0
        ? 'で、水潮（真水の影響）の心配はありません。'
        : weather.past24hPrecipMm < 12
        ? 'で、魚の警戒心を和らげる適度な笹濁りが期待できます。'
        : 'と多めのため、表層の真水や強い濁りを避けてボトム付近や潮通しの良い釣り座を選びましょう。'
    }`,
    windNote: `${windJudge.windFromLabel}（風速 ${weather.windSpeedMs}m/s・波高 ${weather.waveHeightM}m）で、釣り座の向きに対して「${windJudge.badgeLabel}」となっています。${windJudge.description}`,
    nextAction: safetyWarning
      ? '安全を最優先し、風が穏やかな日や安全な内向き・別時間帯への変更をおすすめします。'
      : windJudge.relation === 'headwind' && weather.windSpeedMs >= 4
      ? 'オモリやルアーを普段より1〜2ランク重くして底を取りやすくするか、風を背にできる対岸ポイントを検討しましょう。'
      : isSlackTide
      ? '今のうちにリーダー点検や仕掛けの準備を済ませ、30〜60分後の「潮の動き出し」に集中してキャストしましょう。'
      : cfg.beginnerTip,
  };

  return {
    hour,
    genreId,
    total: finalScore,
    rawBeforeBreaker: rawScore,
    subScores: {
      time: subTime,
      tide: subTide,
      weather: subWeather,
      windWave: subWindWave,
      maxTime: w.time,
      maxTide: w.tide,
      maxWeather: w.weather,
      maxWindWave: w.windWave,
    },
    bonusDelta,
    safetyWarning,
    safetyReason,
    auxiliaryBadge,
    reasonTags: topReasons,
    translation,
    sonamaruComment,
    sonamaruMood,
  };
}

/**
 * 24時間のスコア配列から「今日のベストタイム」連続区間を自動抽出
 */
export function extractBestTimeWindow(
  hourlyScores: HourlyFishScore[],
  sunriseStr: string,
  sunsetStr: string
): BestTimeWindow {
  if (hourlyScores.length === 0) {
    return {
      startStr: '05:30',
      endStr: '07:30',
      peakScore: 0,
      peakHour: 6,
      rankSymbol: '△',
      label: '05:30 - 07:30 △',
    };
  }

  let peakItem = hourlyScores[0];
  for (const s of hourlyScores) {
    if (s.total > peakItem.total) peakItem = s;
  }

  // 75点以上の連続区間を探索
  let bestSegment: HourlyFishScore[] = [];
  let currentSeg: HourlyFishScore[] = [];

  for (const s of hourlyScores) {
    if (s.total >= BEST_TIME_CONFIG.highScoreThreshold) {
      currentSeg.push(s);
      const currMax = Math.max(...currentSeg.map((x) => x.total));
      const bestMax = bestSegment.length > 0 ? Math.max(...bestSegment.map((x) => x.total)) : -1;
      if (currMax > bestMax || (currMax === bestMax && currentSeg.length > bestSegment.length)) {
        bestSegment = [...currentSeg];
      }
    } else {
      currentSeg = [];
    }
  }

  let startHour: number;
  let endHour: number;

  if (bestSegment.length > 0) {
    startHour = bestSegment[0].hour;
    endHour = Math.min(bestSegment[bestSegment.length - 1].hour + 1, startHour + 4);
    // 1時間だけの場合は前後を含めて2時間枠に整える
    if (endHour - startHour < 2) {
      endHour = Math.min(24, startHour + 2);
    }
  } else {
    startHour = Math.max(0, peakItem.hour - 1);
    endHour = Math.min(24, startHour + 2);
  }

  // 日の出・日の入りと重なるマズメ帯は30分単位の見やすい表記に補正（例: 05:30 - 07:30）
  const srH = Number(sunriseStr.split(':')[0]);
  const ssH = Number(sunsetStr.split(':')[0]);
  let startStr = `${String(startHour).padStart(2, '0')}:00`;
  let endStr = `${String(endHour % 24).padStart(2, '0')}:00`;
  if (endHour === 24) endStr = '24:00';

  if (Math.abs(startHour - srH) <= 1 && endHour - startHour <= 3) {
    const startM = Math.max(0, srH * 60 - 30);
    const endM = Math.min(24 * 60, startM + 120);
    startStr = `${String(Math.floor(startM / 60)).padStart(2, '0')}:${String(startM % 60).padStart(2, '0')}`;
    endStr = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
  } else if (Math.abs(startHour - ssH) <= 1 && endHour - startHour <= 3) {
    const startM = Math.max(0, ssH * 60 - 30);
    const endM = Math.min(24 * 60, startM + 120);
    startStr = `${String(Math.floor(startM / 60)).padStart(2, '0')}:${String(startM % 60).padStart(2, '0')}`;
    endStr = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
  }

  const rankSymbol: '◎' | '○' | '△' =
    peakItem.total >= BEST_TIME_CONFIG.highScoreThreshold
      ? '◎'
      : peakItem.total >= BEST_TIME_CONFIG.goodScoreThreshold
      ? '○'
      : '△';

  return {
    startStr,
    endStr,
    peakScore: peakItem.total,
    peakHour: peakItem.hour,
    rankSymbol,
    label: `${startStr} - ${endStr} ${rankSymbol}`,
  };
}

/**
 * 全6ジャンルの24時間評価＋狙い目TOP3バッジ付与を一括実行
 * 仕様: 65点以上の魚種の中から上位3つまでに 1 / 2 / 3 バッジを付与（全魚種64点以下なら非表示）
 */
export function evaluateAllGenresForDay(
  dailyWeather: DailyWeatherForecast,
  dailyTide: DailyTideData,
  spot: FishingSpot
): Record<FishGenreId, DailyFishEvaluation> {
  const tempList: DailyFishEvaluation[] = FISH_GENRE_LIST.map((cfg) => {
    const hourlyScores: HourlyFishScore[] = [];
    for (let h = 0; h < 24; h++) {
      const wPoint = dailyWeather.hourly[h] ?? dailyWeather.hourly[0];
      const tPoint = dailyTide.hourly[h] ?? dailyTide.hourly[0];
      hourlyScores.push(
        evaluateHourlyFishScore(cfg.id, h, wPoint, dailyWeather, tPoint, dailyTide, spot)
      );
    }

    let peakScore = 0;
    let peakHour = 6;
    for (const hs of hourlyScores) {
      if (hs.total > peakScore) {
        peakScore = hs.total;
        peakHour = hs.hour;
      }
    }

    const bestWindow = extractBestTimeWindow(
      hourlyScores,
      dailyWeather.sunriseStr,
      dailyWeather.sunsetStr
    );

    return {
      genreId: cfg.id,
      peakScore,
      peakHour,
      topRankBadge: null,
      bestWindow,
      hourlyScores,
    };
  });

  // 65点以上の魚種をピークスコア降順でTOP3ランク付け
  const qualified = tempList
    .filter((item) => item.peakScore >= 65)
    .sort((a, b) => b.peakScore - a.peakScore)
    .slice(0, 3);

  qualified.forEach((item, idx) => {
    item.topRankBadge = (idx + 1) as 1 | 2 | 3;
  });

  const result = {} as Record<FishGenreId, DailyFishEvaluation>;
  for (const item of tempList) {
    result[item.genreId] = item;
  }
  return result;
}
