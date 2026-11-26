import { FISH_SCORING_CONFIG } from '@/config/fishScoringConfig';
import { decodeWmoWeather, evaluateWindRelation } from '@/lib/windUtils';
import {
  DailyFishEvaluation,
  DailyTideData,
  DailyWeatherForecast,
  FishGenreId,
  FishingSpot,
  StrategyPlan,
} from '@/types';

const STRATEGY_CACHE_PREFIX = 'tsuripulse_strategy_v1_';
const STRATEGY_TTL_MS = 3 * 3600 * 1000; // 3時間キャッシュ

function makeStrategyCacheKey(
  spotId: string,
  dateStr: string,
  genreId: FishGenreId
): string {
  return `${STRATEGY_CACHE_PREFIX}${spotId}_${dateStr}_${genreId}`;
}

/**
 * APIキー未設定時・オフライン時でも即座に高品質な戦術プランを返すリッチ・ルールベース作戦生成
 * - headline（ソナまるの吹き出し）: 元気なキャラ口調
 * - 各解説パネル（targetTiming / tackleAndRange / windAndTideTip / safetyNote）: 自然で統一された「です・ます調」
 */
export function buildRuleBasedStrategy(
  spot: FishingSpot,
  genreId: FishGenreId,
  evalData: DailyFishEvaluation,
  dailyWeather: DailyWeatherForecast,
  dailyTide: DailyTideData,
  selectedHour: number
): StrategyPlan {
  const cfg = FISH_SCORING_CONFIG[genreId];
  const hourWeather = dailyWeather.hourly[selectedHour] ?? dailyWeather.hourly[evalData.peakHour];
  const hourTide = dailyTide.hourly[selectedHour] ?? dailyTide.hourly[evalData.peakHour];
  const hourScore = evalData.hourlyScores[selectedHour] ?? evalData.hourlyScores[evalData.peakHour];
  const wmo = decodeWmoWeather(hourWeather.weatherCode);
  const wind = evaluateWindRelation(
    hourWeather.windDirectionDeg,
    hourWeather.windSpeedMs,
    spot.seaDirectionDeg
  );

  const highTides = dailyTide.extremes
    .filter((e) => e.type === 'high')
    .map((e) => `${e.timeStr}(${e.levelCm}cm)`)
    .join(' / ');
  const lowTides = dailyTide.extremes
    .filter((e) => e.type === 'low')
    .map((e) => `${e.timeStr}(${e.levelCm}cm)`)
    .join(' / ');

  // ジャンル別の具体的なタナ・仕掛け戦術（読みやすい「です・ます調」に統一）
  const tackleMap: Record<FishGenreId, string> = {
    sabiki:
      hourWeather.windSpeedMs >= 4.0
        ? '風があるため、下カゴ式サビキにやや重めのオモリ（8〜10号）を合わせると仕掛けが安定します。まずは底まで落として2〜3回シャクり、底から1〜2mのタナをキープするのが効果的です。'
        : 'ピンクスキン4〜6号のサビキ仕掛けにアミエビを8分目ほど詰めて投入しましょう。朝夕マズメは中層〜表層、日中は底付近までしっかり沈めてアタリを待つのが基本です。',
    bluefish:
      wind.relation === 'tailwind' && hourWeather.windSpeedMs < 6.0
        ? '追い風を活かして30〜40gのメタルジグをフルキャストしましょう。着底後すぐにワンピッチジャークで中層までテンポよく誘い、沖の潮目を重点的に通すのが有効です。'
        : '20〜30gのシルエットが小さめのジグや鉄板バイブが活躍します。朝マズメは表層〜中層の早巻き、日が昇ってからはボトムからのシャクリ上げに切り替えて探りましょう。',
    chinu:
      hourWeather.past24hPrecipMm >= 5
        ? '雨後の濁りが入っているため、視認性の高い黄色系の練りエサやコーン・オキアミのローテーションが効果的です。底トントン〜ハリスを少し這わせるタナ設定をおすすめします。'
        : 'ウキ下は底スレスレを基準にスタートしましょう。潮が動く時間帯はガン玉を段打ちし、撒き餌の帯とサシエがズレないようラインメンディングを意識すると本命率が上がります。',
    rockfish:
      hourScore.auxiliaryBadge === 'メバル◎'
        ? '夜の満潮周りでメバルが浮きやすい状況です。1.0〜1.5gの軽量ジグヘッド＋クリア系ワームで、常夜灯の明暗境界を表層ただ巻きで丁寧に通してみましょう。'
        : 'テトラ際や堤防の壁際ギリギリが最大のポイントです。ブラクリ（2〜3号）に青イソメやサバの切り身を付け、着底後に10cmほど持ち上げて前アタリを待ちましょう。',
    tachiuo:
      selectedHour <= 18
        ? '夕マズメの短い時合いは、ワインド（1/2oz前後）やテンヤで表層〜カウント10の浅ダナを手返しよく探りましょう。暗くなってからはケミホタル＋グローカラーでゆっくり見せる誘いが有効です。'
        : '夜間はタナが徐々に深くなるため、カウント5刻みで反応のある層を探りましょう。アタリがあっても即合わせせず、ティップがしっかり入る本アタリまで送るのがフッキングのコツです。',
    aoriika:
      hourWeather.past24hPrecipMm >= 10
        ? '雨による表層の水潮（真水）を避けるため、3.5号またはディープタイプのエギでボトム付近の塩分が安定した層をじっくり探りましょう。'
        : '3.0〜3.5号のエギ（マズメはピンク・オレンジ金、日中はケイムラ、夜は赤テープ）を使い、着底後3〜4回シャクってから8〜10秒のテンションフォールで抱かせましょう。',
  };

  return {
    source: 'rule-engine',
    generatedAt: Date.now(),
    spotName: spot.name,
    dateStr: dailyWeather.dateStr,
    genreName: cfg.fullName,
    headline: hourScore.safetyWarning
      ? `ピピッ⚠️ 今日は荒天警戒モードだよ！安全最優先で無理のない判断をしようねっ！`
      : `ピピッ！${spot.name}での「${cfg.shortName}」攻略プランをまとめたよっ！（本日最高 ${evalData.peakScore}点）`,
    targetTiming: `本日のベストタイムは「${evalData.bestWindow.label}」です。日の出（${dailyWeather.sunriseStr}）・日の入り（${dailyWeather.sunsetStr}）と潮の動き出しが重なる30分前には釣り座に入り、タックルの準備を済ませておくと時合いを逃しません。`,
    tackleAndRange: tackleMap[genreId],
    windAndTideTip: `潮回りは「${dailyTide.tideName}（満潮 ${highTides || 'なし'} ／ 干潮 ${lowTides || 'なし'}）」です。${selectedHour}時時点は「${hourTide.state}（潮位${hourTide.levelCm}cm）」、天候は${wmo.label}、${wind.windFromLabel} ${hourWeather.windSpeedMs}m/s（${wind.badgeLabel}）となっています。${wind.description}`,
    safetyNote:
      hourScore.safetyWarning || hourWeather.windSpeedMs >= 6 || hourWeather.waveHeightM >= 1.2
        ? `風速${hourWeather.windSpeedMs}m/s・波高${hourWeather.waveHeightM}mの予報が出ています。波しぶきを被る外向き波止やテトラ帯への立ち入りは避け、ライフジャケットを必ず着用してください。`
        : '釣行時はライフジャケットを常時着用し、濡れて滑りやすい足元や、朝夕マズメ・夜間のヘッドライト点灯確認など安全対策を徹底しましょう。',
  };
}

/**
 * AI作戦会議プランを取得（3時間LocalStorageキャッシュ ＋ Gemini API ＋ 自動ルールベースフォールバック）
 */
export async function getOrGenerateStrategyPlan(params: {
  spot: FishingSpot;
  genreId: FishGenreId;
  evalData: DailyFishEvaluation;
  dailyWeather: DailyWeatherForecast;
  dailyTide: DailyTideData;
  selectedHour: number;
  apiKey?: string;
  forceRefresh?: boolean;
}): Promise<StrategyPlan> {
  const {
    spot,
    genreId,
    evalData,
    dailyWeather,
    dailyTide,
    selectedHour,
    apiKey,
    forceRefresh = false,
  } = params;

  const cacheKey = makeStrategyCacheKey(spot.id, dailyWeather.dateStr, genreId);

  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as StrategyPlan;
        if (Date.now() - parsed.generatedAt < STRATEGY_TTL_MS) {
          return parsed;
        }
      }
    } catch {
      // ignore cache errors
    }
  }

  const effectiveKey =
    (apiKey && apiKey.trim()) ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : '') ||
    '';

  const fallbackPlan = buildRuleBasedStrategy(
    spot,
    genreId,
    evalData,
    dailyWeather,
    dailyTide,
    selectedHour
  );

  if (!effectiveKey) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fallbackPlan));
      } catch {
        // ignore
      }
    }
    return fallbackPlan;
  }

  try {
    const cfg = FISH_SCORING_CONFIG[genreId];
    const hourWx = dailyWeather.hourly[selectedHour] ?? dailyWeather.hourly[evalData.peakHour];
    const wind = evaluateWindRelation(
      hourWx.windDirectionDeg,
      hourWx.windSpeedMs,
      spot.seaDirectionDeg
    );

    const prompt = `
あなたは釣りアプリ「ツリパルス」のAIソナードローン相棒「ソナまる」です。
以下の気象・潮汐データに基づき、具体的な作戦会議アドバイスをJSON形式で出力してください。水温は推測・言及しないでください。
文体ルール：
- "headline" のみ、ソナまるの明るいキャラ口調（「ピピッ！」「〜だよっ！」、荒天時は真剣な注意喚起）にしてください。
- "targetTiming", "tackleAndRange", "windAndTideTip", "safetyNote" の4項目は、自然で読みやすい丁寧な「です・ます調」に統一してください（釣り用語は自然に使用して構いません）。

- 釣り場: ${spot.name} (${spot.area})
- 日付: ${dailyWeather.dateStr} (日の出 ${dailyWeather.sunriseStr} / 日の入り ${dailyWeather.sunsetStr})
- 狙う魚種: ${cfg.fullName}
- 当日最高スコア: ${evalData.peakScore}点 / ベストタイム: ${evalData.bestWindow.label}
- 潮回り: ${dailyTide.tideName} (月齢 ${dailyTide.moonAge})
- 選択時刻(${selectedHour}:00)の風速: ${hourWx.windSpeedMs}m/s (${wind.windFromLabel} / 海向きに対し${wind.badgeLabel})
- 波高: ${hourWx.waveHeightM}m / 過去24h雨量: ${hourWx.past24hPrecipMm}mm / 降水確率: ${hourWx.precipProb}%

必ず以下のJSONキーのみを持つオブジェクトを返してください:
{
  "headline": "1行のソナまる口調の総評",
  "targetTiming": "狙うべき時間帯と時合いの立ち回り（です・ます調で2〜3文）",
  "tackleAndRange": "おすすめの仕掛け・ルアー重さ・狙うタナ（です・ます調で2〜3文）",
  "windAndTideTip": "今日の潮の動きと風向きを活かす・対策するコツ（です・ます調で2〜3文）",
  "safetyNote": "服装・安全装備の注意点（です・ます調で1〜2文）"
}
`.trim();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      effectiveKey
    )}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsedJson = JSON.parse(rawText) as Partial<StrategyPlan>;

    const geminiPlan: StrategyPlan = {
      source: 'gemini',
      generatedAt: Date.now(),
      spotName: spot.name,
      dateStr: dailyWeather.dateStr,
      genreName: cfg.fullName,
      headline: parsedJson.headline || fallbackPlan.headline,
      targetTiming: parsedJson.targetTiming || fallbackPlan.targetTiming,
      tackleAndRange: parsedJson.tackleAndRange || fallbackPlan.tackleAndRange,
      windAndTideTip: parsedJson.windAndTideTip || fallbackPlan.windAndTideTip,
      safetyNote: parsedJson.safetyNote || fallbackPlan.safetyNote,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(geminiPlan));
      } catch {
        // ignore
      }
    }
    return geminiPlan;
  } catch {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fallbackPlan));
      } catch {
        // ignore
      }
    }
    return fallbackPlan;
  }
}
