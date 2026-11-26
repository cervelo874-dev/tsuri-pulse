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

  // ジャンル別の具体的なタナ・仕掛け戦術
  const tackleMap: Record<FishGenreId, string> = {
    sabiki:
      hourWeather.windSpeedMs >= 4.0
        ? '風があるため下カゴ式サビキ＋少し重めのオモリ(8〜10号)で仕掛けを安定させよう！まずは底まで落として2〜3回シャクり、底から1〜2mのタナをキープするのがコツだよっ！'
        : 'ピンクスキン4〜6号のサビキ仕掛けにアミエビを8分目まで詰めて投入！朝夕マズメは中層〜表層、日中は底付近までしっかり沈めてアタリを待とう！',
    bluefish:
      wind.relation === 'tailwind'
        ? '追い風を活かして30〜40gのメタルジグをフルキャスト！着底後すぐにワンピッチジャークで中層までテンポよく誘い、潮目の変化を重点的に通そう！'
        : '20〜30gのシルエットが小さめのジグや鉄板バイブが有効！朝マズメは表層〜中層の早巻き、日が昇ったらボトムからのシャクリ上げに切り替えてみてね！',
    chinu:
      hourWeather.past24hPrecipMm >= 5
        ? '雨後の濁りが入っているため、視認性の高い黄色系練りエサやコーン・オキアミのローテーションが効果的！底トントン〜ハリスを少し這わせるタナ設定がおすすめだよ！'
        : 'ウキ下は底スレスレを基準にスタート！潮が動く時間はガン玉を段打ちして撒き餌の帯とサシエがズレないように同調させると本命率がグッと上がるよっ！',
    rockfish:
      hourScore.auxiliaryBadge === 'メバル◎'
        ? '夜の満潮周りでメバルが浮きやすい状況！1.0〜1.5gの軽量ジグヘッド＋クリア系ワームで常夜灯の明暗境界を表層ただ巻きで通してみよう！'
        : 'テトラ際や堤防の壁際ギリギリが最大のポイント！ブラクリ(2〜3号)に青イソメやサバ切り身を付け、底に着いたら10cmだけ持ち上げてコツコツという前アタリを待とう！',
    tachiuo:
      selectedHour <= 18
        ? '夕マズメの短い時合いはワインド（1/2oz前後）やテンヤで表層〜カウント10の浅ダナを手返しよくサーチ！暗くなったらケミホタル＋グローカラーでゆっくり見せよう！'
        : '夜はタナが少しずつ深くなるのでカウント5刻みで反応のある層を探ろう！アタリがあってもすぐ合わせず、竿先がグッと入る本アタリまで送るのがフッキングの秘訣だよ！',
    aoriika:
      hourWeather.past24hPrecipMm >= 10
        ? '雨による表層の真水（水潮）を避けるため、少し重めの3.5号またはディープタイプのエギでボトム付近の塩分が濃い層をネチネチ丁寧に誘おう！'
        : '3.0〜3.5号のエギ（マズメはピンク/オレンジ金、日中はケイムラ/青テープ、夜は赤テープ）で、着底後3〜4回シャクって8〜10秒のテンションフォールで抱かせよう！',
  };

  return {
    source: 'rule-engine',
    generatedAt: Date.now(),
    spotName: spot.name,
    dateStr: dailyWeather.dateStr,
    genreName: cfg.fullName,
    headline: hourScore.safetyWarning
      ? `ピピッ⚠️ 今日は荒天警戒モード！安全最優先で無理のない判断をしようね！`
      : `ピピッ！${spot.name}での「${cfg.shortName}」攻略プランをまとめたよっ！（最高${evalData.peakScore}点）`,
    targetTiming: `イチオシの勝負時間は「${evalData.bestWindow.label}」！日の出 ${dailyWeather.sunriseStr} / 日の入り ${dailyWeather.sunsetStr} と潮の動きが重なる前後30分には釣り座に入って仕掛けを準備しておくと時合いを逃さないよっ！`,
    tackleAndRange: tackleMap[genreId],
    windAndTideTip: `潮回りは「${dailyTide.tideName}（満潮 ${highTides || 'なし'} / 干潮 ${lowTides || 'なし'}）」。${selectedHour}時時点は「${hourTide.state}（${hourTide.levelCm}cm）」・${wmo.label}・${wind.windFromLabel} ${hourWeather.windSpeedMs}m/s（${wind.badgeLabel}）。${wind.description}`,
    safetyNote:
      hourScore.safetyWarning || hourWeather.windSpeedMs >= 6 || hourWeather.waveHeightM >= 1.1
        ? `⚠️ 風速${hourWeather.windSpeedMs}m/s・波高${hourWeather.waveHeightM}m予報のため、波しぶきを被る外向き波止やテトラ帯には絶対に乗らないでね！ライフジャケット常時着用必須だよ！`
        : 'ライフジャケットを必ず着用し、足元の濡れた箇所や夜間・マズメ時のヘッドライト足元確認を忘れずに安全第一で楽しもうねっ！',
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

  // Gemini API 呼び出し（失敗時はエラーを出さず fallbackPlan を返す）
  try {
    const cfg = FISH_SCORING_CONFIG[genreId];
    const hourWx = dailyWeather.hourly[selectedHour] ?? dailyWeather.hourly[evalData.peakHour];
    const wind = evaluateWindRelation(
      hourWx.windDirectionDeg,
      hourWx.windSpeedMs,
      spot.seaDirectionDeg
    );

    const prompt = `
あなたは釣りアプリ「ツリパルス」の元気で親しみやすい小型魚型AIソナードローン相棒「ソナまる」です（「ピピッ！」「〜だよっ！」などの明るい口調、ただし悪天候時は安全第一で真剣に注意喚起）。
以下の気象・潮汐データに基づき、初心者にも分かりやすい具体的な作戦会議アドバイスをJSON形式で出力してください。水温は推測・言及しないでください。

- 釣り場: ${spot.name} (${spot.area})
- 日付: ${dailyWeather.dateStr} (日の出 ${dailyWeather.sunriseStr} / 日の入り ${dailyWeather.sunsetStr})
- 狙う魚種: ${cfg.fullName}
- 当日最高スコア: ${evalData.peakScore}点 / ベストタイム: ${evalData.bestWindow.label}
- 潮回り: ${dailyTide.tideName} (月齢 ${dailyTide.moonAge})
- 選択時刻(${selectedHour}:00)の風速: ${hourWx.windSpeedMs}m/s (${wind.windFromLabel} / 海向きに対し${wind.badgeLabel})
- 波高: ${hourWx.waveHeightM}m / 過去24h雨量: ${hourWx.past24hPrecipMm}mm / 降水確率: ${hourWx.precipProb}%

必ず以下のJSONキーのみを持つオブジェクトを返してください:
{
  "headline": "1行の元気な総評（安全警告時は注意喚起）",
  "targetTiming": "狙うべき時間帯と時合いの立ち回り（2〜3文）",
  "tackleAndRange": "おすすめの仕掛け・ルアー重さ・狙うタナ（深さ）（2〜3文）",
  "windAndTideTip": "今日の潮の動きと風向きを活かす（または対策する）コツ（2〜3文）",
  "safetyNote": "服装・安全装備の注意点（1〜2文）"
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
    // API制限やオフライン時もエラー表示にせずルールベース戦術へ自動フォールバック
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
