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
          detail: 'プランクトンと小魚の活性が一気に上がるゴールデンタイム！',
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
          detail: '満干潮前後は潮が止まり、回遊魚の群れが一時的に落ち着きやすい時間帯です。',
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
          detail: 'コマセ（アミエビ）が綺麗に漂い、アジ・イワシが回遊しやすい理想的な流れ！',
          magnitude: 8,
        });
      } else if (tide.state === '動き出し') {
        tideRatio = 0.86;
        reasons.push({
          label: '潮の動き出し◎',
          impact: 'positive',
          detail: '止まっていた潮が動き始め、魚のやる気スイッチが入るタイミング！',
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
          detail: '曇り空で魚の警戒心が薄れ、日中も浅いタナまで浮きやすい空模様！',
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
          detail: '風・波ともに穏やかで、初心者やファミリーでも竿先のアタリがはっきり分かります！',
          magnitude: 7,
        });
      } else if (weather.windSpeedMs >= 5.0 || weather.waveHeightM >= 1.0) {
        windRatio = 0.28;
        bonusDelta -= 6;
        reasons.push({
          label: '強風・波に注意',
          impact: 'negative',
          detail: `風速${weather.windSpeedMs}m/sで軽いサビキ仕掛けが流されやすい状態です。`,
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
          detail: '青物・サゴシがベイトを追い回す1日最大の激アツ時間帯！',
          magnitude: 10,
        });
      } else if (tc.isEveningMazume) {
        timeRatio = 0.84;
        reasons.push({
          label: '夕マズメ回遊◎',
          impact: 'positive',
          detail: '日没前に再びベイトが岸寄りし、ナブラやボイルが出やすい時間！',
          magnitude: 7,
        });
      } else if (tc.isPreDawn) {
        timeRatio = 0.66;
      } else if (tc.isDaytime) {
        timeRatio = 0.58;
      } else {
        // 完全な夜間は大幅減点
        timeRatio = 0.12;
        bonusDelta -= 12;
        reasons.push({
          label: '夜間は青物オフ時間',
          impact: 'negative',
          detail: '青物は視覚で小魚を追うため、真っ暗な夜間はほぼ回遊が止まります。',
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
          detail: '水深が浅くなり潮流も緩むため、大型回遊魚が沖へ離れやすいタイミング。',
          magnitude: 7,
        });
      } else if (isSpringOrModTide && tide.flowSpeedNormalized >= 0.55) {
        tideRatio = 0.96;
        reasons.push({
          label: `${dailyTide.tideName}の急潮流◎`,
          impact: 'positive',
          detail: '潮がしっかり効いて小魚が流され、青物の捕食スイッチが全開に！',
          magnitude: 9,
        });
      } else if (tide.flowSpeedNormalized >= 0.35) {
        tideRatio = 0.78;
      } else {
        tideRatio = 0.45;
      }

      // 3. 天候・過去24h雨 (10) - 曇り・軽い濁り(1〜10mm)加点、大雨(20mm〜)減点
      if (weather.past24hPrecipMm >= 20) {
        weatherRatio = 0.2;
        bonusDelta -= 8;
        reasons.push({
          label: '大雨後の泥濁り懸念',
          impact: 'negative',
          detail: `過去24時間雨量${weather.past24hPrecipMm}mmの影響で強い濁り・ゴミ浮遊に注意。`,
          magnitude: 8,
        });
      } else if (weather.past24hPrecipMm >= 1 && weather.past24hPrecipMm <= 10 && !wmo.isStormy) {
        weatherRatio = 0.96;
        bonusDelta += 3;
        reasons.push({
          label: '程よい濁りで騙しやすい◎',
          impact: 'positive',
          detail: '少量の雨による絶妙な笹濁りで、ルアーへの見切りが減る好条件！',
          magnitude: 5,
        });
      } else if (wmo.kind === 'cloudy' || wmo.kind === 'partly-cloudy') {
        weatherRatio = 0.88;
      } else {
        weatherRatio = wmo.isRainy ? 0.52 : 0.76;
      }

      // 4. 風・波 (15) - 適度な波気(0.3〜0.8m)・追い風加点、強い向かい風(6m/s〜)減点
      if (windJudge.relation === 'headwind' && weather.windSpeedMs >= 6.0) {
        windRatio = 0.2;
        bonusDelta -= 8;
        reasons.push({
          label: '強い向かい風✕',
          impact: 'negative',
          detail: '正面からの強風でメタルジグの飛距離が落ち、波しぶきも被りやすい状態。',
          magnitude: 7,
        });
      } else if (
        windJudge.relation === 'tailwind' &&
        weather.windSpeedMs <= 6.0 &&
        weather.waveHeightM <= 1.0
      ) {
        windRatio = 0.96;
        bonusDelta += 3;
        reasons.push({
          label: '追い風ロングキャスト◎',
          impact: 'positive',
          detail: '追い風に乗ってルアーが沖の潮目まで大遠投できるチャンス！',
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
      // 1. 時間帯 (15) - 日中も安定評価、マズメ微増
      if (tc.isMorningMazume || tc.isEveningMazume) {
        timeRatio = 0.94;
      } else if (tc.isDaytime) {
        timeRatio = 0.82;
      } else if (tc.isEarlyNight) {
        timeRatio = 0.74; // 夜チヌ・キビレも狙える
      } else {
        timeRatio = 0.56;
      }

      // 2. 潮の動き (30) - 中潮など安定した流れ◎
      if (dailyTide.tideName === '中潮' && tide.flowSpeedNormalized >= 0.25 && tide.flowSpeedNormalized <= 0.75) {
        tideRatio = 0.95;
        reasons.push({
          label: '中潮の安定した流れ◎',
          impact: 'positive',
          detail: '速すぎず遅すぎない安定した潮流で、撒き餌と仕掛けが同調しやすい絶好の潮！',
          magnitude: 8,
        });
      } else if (tide.flowSpeedNormalized >= 0.2 && !isSlackTide) {
        tideRatio = 0.82;
      } else {
        tideRatio = 0.48;
      }

      // 3. 天候・過去雨・気圧 (25) - 曇り・小雨・気圧低下傾向◎、快晴×ベタ凪や大量真水減点
      const isFallingPressure = weather.pressureTrend3h <= -0.8;
      if (weather.past24hPrecipMm >= 22) {
        weatherRatio = 0.32;
        bonusDelta -= 6;
        reasons.push({
          label: '大雨後の大量真水',
          impact: 'negative',
          detail: '表層に冷たい真水が入りすぎているため、底付近をじっくり狙う工夫が必要です。',
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
          detail: '光量が抑えられ気圧も下がり気味で、警戒心の強いチヌ・グレが浮きやすい好条件！',
          magnitude: 8,
        });
      } else if (wmo.kind === 'clear' && weather.waveHeightM < 0.2 && weather.windSpeedMs < 1.5) {
        weatherRatio = 0.42;
        bonusDelta -= 5;
        reasons.push({
          label: '快晴×ベタ凪で見切られ注意',
          impact: 'negative',
          detail: '海が澄んで穏やかすぎるため、魚の警戒心が高め。ハリスを細く・岸際から離れて立とう！',
          magnitude: 6,
        });
      } else {
        weatherRatio = 0.72;
      }

      // 4. 風・波 (30) - 適度な波(0.4〜0.9m)加点、大波(1.2m〜)や横風・強風減点
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
          detail: '横風で道糸が取られやすいため、水中ウキやガン玉でラインを沈めると◎',
          magnitude: 6,
        });
      } else if (weather.waveHeightM >= 0.35 && weather.waveHeightM <= 0.9 && weather.windSpeedMs <= 4.2) {
        windRatio = 0.94;
        reasons.push({
          label: '適度な波気で活性UP◎',
          impact: 'positive',
          detail: `波高${weather.waveHeightM}mの程よいざわつきがチヌ・メジナの警戒心をカバー！`,
          magnitude: 7,
        });
      } else {
        windRatio = 0.74;
      }
      break;
    }

    case 'rockfish': {
      // 特殊補助ラベル判定: 干潮前後は「穴釣り◎」、夜間満潮前後は「メバル◎」
      const isNightish = !tc.isDaytime;
      if (isNightish && (tide.state === '満潮前後' || tide.levelNormalized >= 0.65)) {
        auxiliaryBadge = 'メバル◎';
      } else if (tide.state === '干潮前後' || tide.levelNormalized <= 0.34) {
        auxiliaryBadge = '穴釣り◎';
      }

      // 1. 時間帯 (30) - 夕〜夜〜朝マズメ高評価＋日中干潮時も下げすぎない(穴釣り)
      if (tc.isEveningMazume || tc.isEarlyNight || tc.isMorningMazume) {
        timeRatio = 0.95;
        reasons.push({
          label: tc.isDaytime ? '根魚時合い' : '夕〜夜の根魚ゴールデンタイム◎',
          impact: 'positive',
          detail: '暗くなるとガシラやメバルが岩陰・壁際から出て活発にエサを探し始めます！',
          magnitude: 8,
        });
      } else if (tc.isDeepNight || tc.isPreDawn) {
        timeRatio = 0.84;
      } else {
        // 日中も穴釣りなら十分狙える（下げすぎない）
        timeRatio = tide.levelNormalized <= 0.4 ? 0.74 : 0.64;
        if (auxiliaryBadge === '穴釣り◎') {
          reasons.push({
            label: '日中の穴釣り好機◎',
            impact: 'positive',
            detail: '干潮前後は岩陰に潜むガシラの目の前にブラクリを落としやすいチャンス！',
            magnitude: 6,
          });
        }
      }

      // 2. 潮の動き (20) - 緩やかな潮◎
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
          detail: '潮位が高く常夜灯まわりにメバルが浮きやすい絶好のタイミング！',
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

      // 4. 風・波 (35) - 無風〜微風(〜2.5m/s)大加点、4m/s以上・波1.0m以上減点
      if (weather.windSpeedMs <= 2.5 && weather.waveHeightM < 0.6) {
        windRatio = 0.98;
        bonusDelta += 2;
        reasons.push({
          label: '微風ベタ凪で感度抜群◎',
          impact: 'positive',
          detail: `風速${weather.windSpeedMs}m/sの微風！1〜2gの軽いジグヘッドでもコツッというアタリが丸わかり！`,
          magnitude: 9,
        });
      } else if (weather.windSpeedMs >= 4.0 || weather.waveHeightM >= 1.0) {
        windRatio = 0.24;
        bonusDelta -= 7;
        reasons.push({
          label: '風・波で軽量リグ操作難',
          impact: 'negative',
          detail: '風速4m/sを超えると軽い仕掛けが浮き上がるため、重めのブラクリ等で足元を狙おう。',
          magnitude: 9,
        });
      } else {
        windRatio = 0.72;
      }
      break;
    }

    case 'tachiuo': {
      // 1. 時間帯 (45) - 夕マズメ〜夜前半・夜明け前が最強、日中は大幅減点
      if (tc.isEveningMazume) {
        timeRatio = 1.0;
        bonusDelta += 4;
        reasons.push({
          label: '夕マズメのタチウオ時合い🔥',
          impact: 'positive',
          detail: '薄暗くなるこの時間帯はタチウオが浅ダナまで一気に浮上する最大の山場！',
          magnitude: 10,
        });
      } else if (tc.isEarlyNight || tc.isPreDawn) {
        timeRatio = 0.92;
        reasons.push({
          label: tc.isPreDawn ? '夜明け前の時合い◎' : '夜前半の回遊タイム◎',
          impact: 'positive',
          detail: '電気ウキ・テンヤ・ワインドでじっくりタチウオの回遊を狙える好時間帯！',
          magnitude: 8,
        });
      } else if (tc.isDeepNight) {
        timeRatio = 0.72;
      } else if (tc.isMorningMazume) {
        timeRatio = 0.62;
      } else {
        // 日中は大幅減点
        timeRatio = 0.14;
        bonusDelta -= 12;
        reasons.push({
          label: '日中は深場へ移動中',
          impact: 'negative',
          detail: '明るい昼間、堤防周りのタチウオは沖の深場へ沈んでいるため夕方以降が本番です。',
          magnitude: 10,
        });
      }

      // 2. 潮の動き (25) - 程よく動く潮と動き出し◎
      if (tide.state === '動き出し' || (tide.flowSpeedNormalized >= 0.25 && tide.flowSpeedNormalized <= 0.75)) {
        tideRatio = 0.92;
        if (!tc.isDaytime) {
          reasons.push({
            label: tide.state === '動き出し' ? '潮の動き出しで回遊開始◎' : '程よい潮流◎',
            impact: 'positive',
            detail: '潮が緩やかに効いてベイトが溜まり、タチウオの群れが回ってきやすい状態！',
            magnitude: 7,
          });
        }
      } else if (isSlackTide) {
        tideRatio = 0.45;
      } else {
        tideRatio = 0.68;
      }

      // 3. 天候・月齢ボーナス (10) - 新月周り(+3点)、満月×快晴(-3点)
      if (isNewMoonAround && !tc.isDaytime) {
        weatherRatio = 0.95;
        bonusDelta += 3;
        reasons.push({
          label: '新月周りの闇夜ボーナス(+3)',
          impact: 'positive',
          detail: '月明かりが少なく常夜灯やケミホタルの発光にベイト・タチウオが集まりやすい夜！',
          magnitude: 6,
        });
      } else if (isFullMoonAround && wmo.kind === 'clear' && !tc.isDaytime) {
        weatherRatio = 0.48;
        bonusDelta -= 3;
        reasons.push({
          label: '満月×快晴で群れ散り注意(-3)',
          impact: 'negative',
          detail: '月明かりが明るい夜はベイトが広範囲に散りやすいため、少し深めのタナを探ろう。',
          magnitude: 5,
        });
      } else {
        weatherRatio = wmo.isRainy ? 0.45 : 0.82;
      }

      // 4. 風・波 (20) - 穏やかな凪◎、強風・うねり減点
      if (weather.windSpeedMs <= 3.2 && weather.waveHeightM <= 0.6) {
        windRatio = 0.94;
        if (!tc.isDaytime) {
          reasons.push({
            label: '穏やかな凪でウキ・穂先が見やすい◎',
            impact: 'positive',
            detail: '海面が静かでタチウオ特有の繊細な前アタリをしっかり捉えられます！',
            magnitude: 6,
          });
        }
      } else if (weather.windSpeedMs >= 5.0 || weather.waveHeightM >= 1.1) {
        windRatio = 0.3;
        bonusDelta -= 5;
        reasons.push({
          label: '強風・うねり注意',
          impact: 'negative',
          detail: '風波でテンヤやウキが安定しにくいため、オモリ負荷を1ランク上げると有効です。',
          magnitude: 7,
        });
      } else {
        windRatio = 0.7;
      }
      break;
    }

    case 'aoriika': {
      // 1. 時間帯 (30) - 朝夕マズメ＋日中の潮止まり前後も評価
      if (tc.isMorningMazume || tc.isEveningMazume) {
        timeRatio = 0.96;
        reasons.push({
          label: tc.isMorningMazume ? '朝マズメのシャロー接岸◎' : '夕マズメの捕食タイム◎',
          impact: 'positive',
          detail: '光量が変化するマズメ時はアオリイカが浅場へエサを追いかけ回す絶好機！',
          magnitude: 8,
        });
      } else if (tc.isEarlyNight || tc.isDeepNight) {
        timeRatio = 0.82;
      } else {
        // 日中も潮の変わり目ならチャンスあり
        timeRatio = tide.state === '動き出し' || tide.state === '止まりかけ' ? 0.78 : 0.62;
      }

      // 2. 潮の動き (30) - 中潮〜大潮の「動き出し・止まりかけ」◎
      if (
        isSpringOrModTide &&
        (tide.state === '動き出し' || tide.state === '止まりかけ')
      ) {
        tideRatio = 0.98;
        bonusDelta += 2;
        reasons.push({
          label: `${dailyTide.tideName}の潮変わり（${tide.state}）◎`,
          impact: 'positive',
          detail: '潮の流速が切り替わる瞬間はイカがエギを抱きやすい鉄板タイミング！',
          magnitude: 9,
        });
      } else if (tide.flowSpeedNormalized >= 0.2 && tide.flowSpeedNormalized <= 0.75) {
        tideRatio = 0.84;
      } else {
        tideRatio = 0.56;
      }

      // 3. 天候・過去24h雨・月齢 (15) - 夜の満月周り(+3)、本降りの雨＆過去24h大雨15mm以上(水潮)大幅減点
      if (weather.past24hPrecipMm >= 15) {
        weatherRatio = 0.12;
        bonusDelta -= 14;
        reasons.push({
          label: '大雨後の水潮（真水）警戒✕',
          impact: 'negative',
          detail: `過去24h雨量${weather.past24hPrecipMm}mm！イカは真水による塩分低下を非常に嫌うため潮通しの良い外向きが必須です。`,
          magnitude: 10,
        });
      } else if (wmo.kind === 'rain' || wmo.kind === 'heavy-rain') {
        weatherRatio = 0.25;
        bonusDelta -= 7;
        reasons.push({
          label: '本降りの雨で表層塩分低下',
          impact: 'negative',
          detail: '雨で海面付近の塩分が下がるため、ボトム（底）付近を丁寧に探りましょう。',
          magnitude: 7,
        });
      } else if (!tc.isDaytime && isFullMoonAround && wmo.kind !== 'cloudy') {
        weatherRatio = 0.96;
        bonusDelta += 3;
        reasons.push({
          label: '夜の満月周りボーナス(+3)',
          impact: 'positive',
          detail: '月明かりでエギのシルエットがくっきり浮かび、ナイトエギングに最高の夜！',
          magnitude: 7,
        });
      } else {
        weatherRatio = 0.85;
      }

      // 4. 風・波 (25) - 微風(〜3m/s)◎、4m/s〜の横風・向かい風に厳しく減点
      if (weather.windSpeedMs <= 2.8 && weather.waveHeightM <= 0.55) {
        windRatio = 0.97;
        reasons.push({
          label: 'エギング日和の微風◎',
          impact: 'positive',
          detail: 'PEラインが風に流されず、エギのフォール姿勢とアタリが完璧に取れる微風コンディション！',
          magnitude: 8,
        });
      } else if (
        weather.windSpeedMs >= 4.0 &&
        (windJudge.relation === 'crosswind' || windJudge.relation === 'headwind')
      ) {
        windRatio = 0.18;
        bonusDelta -= 10;
        reasons.push({
          label: `${windJudge.badgeLabel.replace(' ', '')}(${weather.windSpeedMs}m/s)でライン煽られ注意`,
          impact: 'negative',
          detail: 'エギング最大の敵である横風・向かい風。ティップを水面に近づけるか風裏ポイントへ移動しよう！',
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
    safetyReason = `${causes.join('・')}のため安全ブレーカー作動中（上限30点ロック）`;
    reasons.unshift({
      label: `⚠️ 安全警戒：${causes.join('・')}`,
      impact: 'warning',
      detail: '堤防での高波や突風は大変危険です。無理な釣行は控え、安全な日・時間帯を選びましょう！',
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
      detail: '大きな悪条件はなく、基本通りにタナと潮目を意識すれば十分狙えるコンディションです。',
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

  // ソナまるの1〜2行ルールベース吹き出し
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

  // 初心者通訳パネルのテキスト構築
  const translation: BeginnerTranslation = {
    headline: safetyWarning
      ? `⚠️ 安全最優先！${safetyReason}`
      : finalScore >= 80
      ? `絶好の釣り日和！条件が噛み合った爆釣チャンスタイムです！`
      : finalScore >= 65
      ? `十分狙える好条件！基本を押さえれば釣果が期待できます。`
      : finalScore >= 45
      ? `まずまずの状況。タナ（深さ）調整や時間帯選びがカギになります。`
      : `今は少し我慢の時間帯。無理せず時合い待ちかターゲット変更が賢い選択！`,
    timeNote: tc.isMorningMazume
      ? `日の出前後の「朝マズメ」！プランクトンから大型魚まで一斉に食事を始める1日1番のゴールデンタイムです。`
      : tc.isEveningMazume
      ? `日の入り前後の「夕マズメ」！薄暗くなり魚の警戒心が解けて岸近くまで寄ってきます。`
      : tc.isDaytime
      ? `明るい日中の時間帯（日の出 ${dailyWeather.sunriseStr} / 日の入り ${dailyWeather.sunsetStr}）。魚は少し深場や日陰・底付近に落ち着きやすくなります。`
      : `夜間の時間帯。夜行性の魚（タチウオ・メバル・ガシラ等）には有利ですが、昼行性の青物はお休みモードです。`,
    tideNote: `今日は「${dailyTide.tideName}（月齢${dailyTide.moonAge}）」。${hour}時時点は「${tide.state}（潮位${tide.levelCm}cm）」。${
      isSlackTide
        ? '満干潮の境目で潮の流れが一休み中なので、次の「動き出し」がチャンスです！'
        : '潮が動いて水中に酸素とエサが運ばれているため、魚の活性が上がりやすい状態です。'
    }`,
    weatherNote: `天気は「${wmo.label}（${weather.tempC}℃・降水確率${weather.precipProb}%）」。過去24時間の雨量は ${weather.past24hPrecipMm}mm ${
      weather.past24hPrecipMm === 0
        ? 'で水潮（真水混じり）の心配はありません。'
        : weather.past24hPrecipMm < 12
        ? 'で、魚を騙しやすいほんのり適度な濁りが期待できます。'
        : 'と多めなので、表層の真水や濁りを避けて底付近・潮通しの良い場所を狙いましょう。'
    }`,
    windNote: `${windJudge.windFromLabel} ${weather.windSpeedMs}m/s（波高 ${weather.waveHeightM}m）。海の方角に対して「${windJudge.badgeLabel}」！${windJudge.description}`,
    nextAction: safetyWarning
      ? '今日は無理な釣行を避け、風が穏やかな日や安全な時間帯へ予定変更しましょう。'
      : windJudge.relation === 'headwind' && weather.windSpeedMs >= 4
      ? 'オモリやルアーを普段より少し重くして底を取りやすくするか、風を背にできる対岸ポイントを検討しよう！'
      : isSlackTide
      ? '今は仕掛けの準備やエサ付けを丁寧に済ませ、30〜60分後の「潮の動き出し」に集中して投げよう！'
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
