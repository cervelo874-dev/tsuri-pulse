import {
  DailyWeatherForecast,
  FishGenreId,
  GearChecklistItem,
} from '@/types';
import { decodeWmoWeather } from '@/lib/windUtils';

/**
 * 6ジャンル別の基本装備初期プリセット（自然で読みやすい「です・ます調」の説明文）
 */
export const DEFAULT_GENRE_GEAR: Record<FishGenreId, GearChecklistItem[]> = {
  sabiki: [
    {
      id: 'sabiki-rig',
      title: 'サビキ仕掛け（予備を含め2〜3枚）',
      subtitle: 'ピンクスキン・ハゲ皮の4〜6号が幅広く使えて便利です。',
      icon: 'sabiki',
      checked: false,
    },
    {
      id: 'sabiki-basket',
      title: 'コマセカゴ ＆ アミエビ',
      subtitle: 'チューブ式のアミエビなら手が汚れにくく初心者にも扱いやすいです。',
      icon: 'sinker',
      checked: false,
    },
    {
      id: 'sabiki-cooler',
      title: 'クーラーボックス ＆ 氷・保冷剤',
      subtitle: '釣れたアジやイワシを新鮮なまま持ち帰るために欠かせません。',
      icon: 'cooler',
      checked: false,
    },
    {
      id: 'sabiki-pliers',
      title: 'フィッシュグリップ（魚つかみ）＆ 水汲みバケツ',
      subtitle: 'ヒレのトゲから手を守り、釣り座の手洗いにも活躍します。',
      icon: 'pliers',
      checked: false,
    },
    {
      id: 'sabiki-lifejacket',
      title: 'ライフジャケット',
      subtitle: '堤防釣りでも必ず着用したい基本の安全装備です。',
      icon: 'lifejacket',
      checked: false,
    },
  ],

  bluefish: [
    {
      id: 'blue-jig',
      title: 'メタルジグ（20g〜40g）＆ 鉄板バイブ',
      subtitle: 'ブルーピンク・ゼブラグロー・シルバー系を揃えておくと安心です。',
      icon: 'lure',
      checked: false,
    },
    {
      id: 'blue-leader',
      title: 'ショックリーダー（フロロ 5〜8号）',
      subtitle: 'サゴシの鋭い歯によるラインブレイク対策としても有効です。',
      icon: 'sabiki',
      checked: false,
    },
    {
      id: 'blue-net',
      title: 'タモ網（ランディングネット 4〜5m）',
      subtitle: '足場の高い堤防で無理な抜き上げによるロッド破損を防ぎます。',
      icon: 'net',
      checked: false,
    },
    {
      id: 'blue-pliers',
      title: 'プライヤー ＆ フィッシュグリップ・ナイフ',
      subtitle: '安全なフック外しや、釣れた後の血抜き処理に使用します。',
      icon: 'pliers',
      checked: false,
    },
    {
      id: 'blue-cooler',
      title: '中型クーラーボックス ＆ ライフジャケット',
      subtitle: '40cm超えのサゴシやハマチが収まるサイズを用意しましょう。',
      icon: 'cooler',
      checked: false,
    },
  ],

  chinu: [
    {
      id: 'chinu-float',
      title: '円錐ウキ・棒ウキ ＆ ガン玉・ハリス（1.2〜2号）',
      subtitle: '当日の潮の速さや水深に合わせて浮力を調整しましょう。',
      icon: 'float',
      checked: false,
    },
    {
      id: 'chinu-bait',
      title: '配合エサ・オキアミ（または落とし込み用エサ）',
      subtitle: 'バッカンや柄杓（ひしゃく）も忘れずに準備しておきましょう。',
      icon: 'cooler',
      checked: false,
    },
    {
      id: 'chinu-net',
      title: '玉網（タモ網）',
      subtitle: 'チヌや良型メジナを確実に取り込むための必須アイテムです。',
      icon: 'net',
      checked: false,
    },
    {
      id: 'chinu-polarized',
      title: '偏光サングラス ＆ ライフジャケット',
      subtitle: '海面のギラつきを抑え、ウキの動きや海中のシモリが見やすくなります。',
      icon: 'sunscreen',
      checked: false,
    },
  ],

  rockfish: [
    {
      id: 'rock-jighead',
      title: 'ジグヘッド（1〜3g）＆ ワーム ／ ブラクリ（2〜4号）',
      subtitle: 'メバル用の軽量リグと、穴釣りガシラ用のブラクリがあると万全です。',
      icon: 'lure',
      checked: false,
    },
    {
      id: 'rock-bait',
      title: '青イソメ・サバの切り身（穴釣り併用時）',
      subtitle: '日中のテトラ際や壁際を探る穴釣りで抜群の集魚力を発揮します。',
      icon: 'sinker',
      checked: false,
    },
    {
      id: 'rock-light',
      title: 'ヘッドライト（赤色LEDモード付き推奨）',
      subtitle: '海面を白い光で直接照らすと魚が警戒するため注意しましょう。',
      icon: 'headlight',
      checked: false,
    },
    {
      id: 'rock-gloves',
      title: 'フィッシンググローブ ＆ ライフジャケット',
      subtitle: '夜間の防寒対策と、岩場・テトラでの手元の保護に役立ちます。',
      icon: 'gloves',
      checked: false,
    },
  ],

  tachiuo: [
    {
      id: 'tachi-tenya',
      title: 'タチウオテンヤ ／ ワインド ／ 電気ウキ仕掛け',
      subtitle: 'ケミホタルや歯切れ防止のワイヤーリーダーもあわせて準備しましょう。',
      icon: 'lure',
      checked: false,
    },
    {
      id: 'tachi-bait',
      title: '冷凍キビナゴ・ドジョウ（エサ釣り併用時）',
      subtitle: 'テンヤへエサを巻き付けるための予備ワイヤーも確認しておきましょう。',
      icon: 'cooler',
      checked: false,
    },
    {
      id: 'tachi-light',
      title: 'ヘッドライト ＆ UV蓄光ライト',
      subtitle: 'グロー系ルアーやテンヤを素早く発光させるのに重宝します。',
      icon: 'headlight',
      checked: false,
    },
    {
      id: 'tachi-grip',
      title: '太刀魚ばさみ（フィッシュグリップ）＆ ロングプライヤー',
      subtitle: 'タチウオの歯は非常に鋭いため、素手で口元に触れないよう注意しましょう。',
      icon: 'pliers',
      checked: false,
    },
  ],

  aoriika: [
    {
      id: 'ika-egi',
      title: 'エギ（2.5号〜3.5号：カラー・沈下速度ローテ用）',
      subtitle: 'ピンク・オレンジ・ケイムラ・赤テープなどを揃えておくと対応しやすいです。',
      icon: 'egi',
      checked: false,
    },
    {
      id: 'ika-leader',
      title: 'エギング用フロロリーダー（1.75〜2.5号）＆ スナップ',
      subtitle: '根ズレでリーダーに傷がついたら、こまめに結び直しましょう。',
      icon: 'sabiki',
      checked: false,
    },
    {
      id: 'ika-gaff',
      title: 'ギャフ または タモ網 ＆ イカ締めピック',
      subtitle: '良型アオリイカの安全な取り込みと、高鮮度での持ち帰りに活躍します。',
      icon: 'net',
      checked: false,
    },
    {
      id: 'ika-bag',
      title: 'チャック付き保存袋（イカスミ対策）＆ ライフジャケット',
      subtitle: 'クーラーボックス内がイカスミで汚れるのをきれいに防げます。',
      icon: 'cooler',
      checked: false,
    },
  ],
};

/**
 * 選択中のスポット・日時の気象予報データから「状況連動ピックアップ持ち物」を自動生成
 */
export function buildWeatherLinkedGear(
  forecast: DailyWeatherForecast,
  selectedHour: number,
  genreId: FishGenreId,
  checkedMap: Record<string, boolean>
): { items: GearChecklistItem[]; sonamaruAdvice: string } {
  const items: GearChecklistItem[] = [];
  const maxWind = Math.max(...forecast.hourly.map((h) => h.windSpeedMs));
  const maxPrecipProb = Math.max(...forecast.hourly.map((h) => h.precipProb));
  const anyRainCode = forecast.hourly.some((h) => decodeWmoWeather(h.weatherCode).isRainy);
  const maxWave = Math.max(...forecast.hourly.map((h) => h.waveHeightM));
  const hourPoint = forecast.hourly[selectedHour] ?? forecast.hourly[6];

  const isNightOrMazume =
    selectedHour <= Math.ceil(forecast.sunriseHour) ||
    selectedHour >= Math.floor(forecast.sunsetHour) - 1 ||
    genreId === 'tachiuo' ||
    genreId === 'rockfish';

  // 1. 風速連動 (5m/s以上 または 選択時刻4.2m/s以上)
  if (maxWind >= 5.0 || hourPoint.windSpeedMs >= 4.2) {
    items.push({
      id: 'wx-heavy-sinker',
      title: '重めのオモリ・シンカー',
      subtitle: `最大風速 ${maxWind}m/s の予報です。仕掛けの流されや糸ふけを抑えるため、1〜2ランク重めを用意しましょう。`,
      icon: 'sinker',
      badgeText: `風 ${maxWind}m/s`,
      checked: !!checkedMap['wx-heavy-sinker'],
    });
    items.push({
      id: 'wx-windbreaker',
      title: '防風ウェア・ウィンドブレーカー',
      subtitle: '海辺の風は体感温度を大きく下げるため、風を通さないアウターがあると快適です。',
      icon: 'windbreaker',
      badgeText: '防風対策',
      checked: !!checkedMap['wx-windbreaker'],
    });
  }

  // 2. 朝夕マズメ / 夜釣り連動
  if (isNightOrMazume) {
    items.push({
      id: 'wx-headlight',
      title: 'ヘッドライト ＆ 予備バッテリー',
      subtitle: '朝夕マズメの薄暗い時間帯の移動や、手元でのノット・仕掛け結びに必須です。',
      icon: 'headlight',
      badgeText: 'マズメ・夜間',
      checked: !!checkedMap['wx-headlight'],
    });
  }

  // 3. 降水確率30%以上 または 雨予報
  if (maxPrecipProb >= 30 || anyRainCode) {
    items.push({
      id: 'wx-rainwear',
      title: 'レインウェア ＆ 防水バッグ',
      subtitle: `最大降水確率 ${maxPrecipProb}% の予報です。釣り場での傘は風に煽られて危険なため、上下レインウェアを用意しましょう。`,
      icon: 'rainwear',
      badgeText: `雨確率 ${maxPrecipProb}%`,
      checked: !!checkedMap['wx-rainwear'],
    });
  }

  // 4. 気温・晴天連動（暑さ・紫外線 / 防寒）
  if (forecast.tempMaxC >= 24 || decodeWmoWeather(forecast.weatherCode).kind === 'clear') {
    items.push({
      id: 'wx-sun-water',
      title: '多めの飲み物 ＆ 日焼け対策・偏光グラス',
      subtitle: `最高気温 ${forecast.tempMaxC}℃ の予報です。海面からの照り返しも強いため、こまめに水分補給を行いましょう。`,
      icon: 'sunscreen',
      badgeText: `${forecast.tempMaxC}℃・UV`,
      checked: !!checkedMap['wx-sun-water'],
    });
  }

  if (forecast.tempMinC <= 13) {
    items.push({
      id: 'wx-warmth',
      title: '防寒グローブ・カイロ・ネックウォーマー',
      subtitle: `最低気温 ${forecast.tempMinC}℃ まで冷え込む予報です。指先がかじかむとラインが結びにくくなるため保温対策をしておきましょう。`,
      icon: 'gloves',
      badgeText: `冷え込み ${forecast.tempMinC}℃`,
      checked: !!checkedMap['wx-warmth'],
    });
  }

  // 5. 波気・常時安全アイテム
  if (maxWave >= 0.7 || items.length < 3) {
    items.push({
      id: 'wx-safety-shoes',
      title: '滑りにくいシューズ ＆ ライフジャケット確認',
      subtitle:
        maxWave >= 0.7
          ? `波高は最大 ${maxWave}m の予報です。濡れた堤防でも滑りにくいソールを選び、安全第一で臨みましょう。`
          : '安全で快適な釣行のために、出発前にライフジャケットと足元の装備を確認しておきましょう。',
      icon: 'lifejacket',
      badgeText: '安全第一',
      checked: !!checkedMap['wx-safety-shoes'],
    });
  }

  // ソナまるの吹き出し（キャラ口調を維持）
  let sonamaruAdvice = 'ピピッ！現地の天気と風に合わせて、忘れやすいアイテムをピックアップしたよっ！';
  if (maxWind >= 5.0 && maxPrecipProb >= 30) {
    sonamaruAdvice = `ピピッ⚠️ 風（最大${maxWind}m/s）と雨（${maxPrecipProb}%）に備えて、「重めのオモリ」と「レインウェア」は絶対入れておこうね！`;
  } else if (maxWind >= 5.0) {
    sonamaruAdvice = `ピピッ💨 最大${maxWind}m/sの風予報だよ！重めのオモリと防風ウェアがあると安心だよっ！`;
  } else if (maxPrecipProb >= 30) {
    sonamaruAdvice = `ピピッ☔ 降水確率${maxPrecipProb}%だよ！傘は危ないからレインウェアを準備してねっ！`;
  } else if (isNightOrMazume) {
    sonamaruAdvice = 'ピピッ✨ マズメや暗くなる時間を狙うなら、ヘッドライトの点灯確認を忘れないでねっ！';
  }

  return { items, sonamaruAdvice };
}
