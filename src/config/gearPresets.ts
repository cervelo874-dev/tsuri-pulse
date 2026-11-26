import {
  DailyWeatherForecast,
  FishGenreId,
  GearChecklistItem,
} from '@/types';
import { decodeWmoWeather } from '@/lib/windUtils';

/**
 * 6ジャンル別の基本装備初期プリセット
 */
export const DEFAULT_GENRE_GEAR: Record<FishGenreId, GearChecklistItem[]> = {
  sabiki: [
    {
      id: 'sabiki-rig',
      title: 'サビキ仕掛け（予備含む2〜3枚）',
      subtitle: 'ピンクスキン・ハゲ皮 4〜6号が万能',
      icon: 'sabiki',
      checked: false,
    },
    {
      id: 'sabiki-basket',
      title: 'コマセカゴ ＆ アミエビ',
      subtitle: 'チューブ式アミエビなら手が汚れず初心者◎',
      icon: 'sinker',
      checked: false,
    },
    {
      id: 'sabiki-cooler',
      title: 'クーラーボックス ＆ 氷・保冷剤',
      subtitle: '釣れたアジを新鮮なまま持ち帰り！',
      icon: 'cooler',
      checked: false,
    },
    {
      id: 'sabiki-pliers',
      title: '魚つかみ（フィッシュグリップ）＆ 水汲みバケツ',
      subtitle: 'ヒレのトゲ対策＆手洗い用',
      icon: 'pliers',
      checked: false,
    },
    {
      id: 'sabiki-lifejacket',
      title: 'ライフジャケット',
      subtitle: '堤防釣りの必須セーフティ装備',
      icon: 'lifejacket',
      checked: false,
    },
  ],

  bluefish: [
    {
      id: 'blue-jig',
      title: 'メタルジグ（20g〜40g）＆ 鉄板バイブ',
      subtitle: 'ブルーピンク・ゼブラグロー・シルバー系',
      icon: 'lure',
      checked: false,
    },
    {
      id: 'blue-leader',
      title: 'ショックリーダー（フロロ 5〜8号）',
      subtitle: 'サゴシの鋭い歯によるラインブレイク対策にも！',
      icon: 'sabiki',
      checked: false,
    },
    {
      id: 'blue-net',
      title: 'タモ網（ランディングネット 4〜5m）',
      subtitle: '足場の高い堤防での抜き上げ破損を防止',
      icon: 'net',
      checked: false,
    },
    {
      id: 'blue-pliers',
      title: 'プライヤー ＆ フィッシュグリップ・ナイフ',
      subtitle: 'フック外し・血抜き処理用',
      icon: 'pliers',
      checked: false,
    },
    {
      id: 'blue-cooler',
      title: '中型クーラーボックス ＆ ライフジャケット',
      subtitle: '40cm超えのサゴシ・ハマチが入るサイズ',
      icon: 'cooler',
      checked: false,
    },
  ],

  chinu: [
    {
      id: 'chinu-float',
      title: '円錐ウキ・棒ウキ ＆ ガン玉・ハリス（1.2〜2号）',
      subtitle: '潮の速さに合わせて浮力調整',
      icon: 'float',
      checked: false,
    },
    {
      id: 'chinu-bait',
      title: '配合エサ・オキアミ（または落とし込みカニ/イガイ）',
      subtitle: 'バッカン・柄杓も忘れずにチェック',
      icon: 'cooler',
      checked: false,
    },
    {
      id: 'chinu-net',
      title: '玉網（タモ網）',
      subtitle: 'チヌ・良型グレの取り込み必須アイテム',
      icon: 'net',
      checked: false,
    },
    {
      id: 'chinu-polarized',
      title: '偏光サングラス ＆ ライフジャケット',
      subtitle: 'ウキの視認性UP＆海中のシモリ確認に大活躍',
      icon: 'sunscreen',
      checked: false,
    },
  ],

  rockfish: [
    {
      id: 'rock-jighead',
      title: 'ジグヘッド（1〜3g）＆ ワーム / ブラクリ（2〜4号）',
      subtitle: 'メバル用軽量リグ＋穴釣りガシラ用ブラクリ',
      icon: 'lure',
      checked: false,
    },
    {
      id: 'rock-bait',
      title: '青イソメ・サバの切り身（穴釣り併用時）',
      subtitle: '日中のテトラ・壁際攻略に抜群の強さ',
      icon: 'sinker',
      checked: false,
    },
    {
      id: 'rock-light',
      title: 'ヘッドライト（赤色LEDモード付）',
      subtitle: '海面を照らして魚を散らさないよう注意！',
      icon: 'headlight',
      checked: false,
    },
    {
      id: 'rock-gloves',
      title: 'フィッシンググローブ ＆ ライフジャケット',
      subtitle: '夜の冷え対策＆岩場・テトラでの手の保護に',
      icon: 'gloves',
      checked: false,
    },
  ],

  tachiuo: [
    {
      id: 'tachi-tenya',
      title: 'タチウオテンヤ / ワインド / 電気ウキ仕掛け',
      subtitle: 'ケミホタル・ワイヤーリーダーも必須！',
      icon: 'lure',
      checked: false,
    },
    {
      id: 'tachi-bait',
      title: '冷凍キビナゴ・ドジョウ（エサ併用時）',
      subtitle: 'テンヤ巻き付け用の予備ワイヤーも確認',
      icon: 'cooler',
      checked: false,
    },
    {
      id: 'tachi-light',
      title: 'ヘッドライト ＆ UV蓄光ライト',
      subtitle: 'グロー系ルアー・テンヤを瞬時に発光チャージ',
      icon: 'headlight',
      checked: false,
    },
    {
      id: 'tachi-grip',
      title: '太刀魚ばさみ（フィッシュグリップ）＆ ロングプライヤー',
      subtitle: 'カミソリのような歯に素手で触れるのは厳禁！',
      icon: 'pliers',
      checked: false,
    },
  ],

  aoriika: [
    {
      id: 'ika-egi',
      title: 'エギ（2.5号〜3.5号：カラー・沈下速度ローテ用）',
      subtitle: 'ピンク・オレンジ・ケイムラ・赤テープを揃えると安心',
      icon: 'egi',
      checked: false,
    },
    {
      id: 'ika-leader',
      title: 'エギング用フロロリーダー（1.75〜2.5号）＆ スナップ',
      subtitle: '根ズレ傷がついたらこまめに結び直し！',
      icon: 'sabiki',
      checked: false,
    },
    {
      id: 'ika-gaff',
      title: 'ギャフ または タモ網 ＆ イカ締めピック',
      subtitle: 'キロアップや春イカのランディング＆鮮度保持',
      icon: 'net',
      checked: false,
    },
    {
      id: 'ika-bag',
      title: 'ジップ袋（イカスミ汚れ防止）＆ ライフジャケット',
      subtitle: 'クーラー内が真っ黒になるのを防げます',
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

  // 1. 風速連動 (5m/s以上 または 選択時刻4m/s以上)
  if (maxWind >= 5.0 || hourPoint.windSpeedMs >= 4.2) {
    items.push({
      id: 'wx-heavy-sinker',
      title: '重めのオモリ・シンカー',
      subtitle: `最大風速 ${maxWind}m/s 予報！仕掛け流され＆糸ふけ対策に1〜2ランク重めを準備`,
      icon: 'sinker',
      badgeText: `風 ${maxWind}m/s`,
      checked: !!checkedMap['wx-heavy-sinker'],
    });
    items.push({
      id: 'wx-windbreaker',
      title: '防風ウェア・ウィンドブレーカー',
      subtitle: '海辺の風は体感温度を大きく奪います。防風アウターがあると快適！',
      icon: 'windbreaker',
      badgeText: '防風対策',
      checked: !!checkedMap['wx-windbreaker'],
    });
  }

  // 2. 朝夕マズメ / 夜釣り連動
  if (isNightOrMazume) {
    items.push({
      id: 'wx-headlight',
      title: 'ヘッドライト ＆ 予備電池',
      subtitle: '朝夕マズメの薄暗い時間帯や手元の仕掛け結びに必須！',
      icon: 'headlight',
      badgeText: 'マズメ・夜間',
      checked: !!checkedMap['wx-headlight'],
    });
  }

  // 3. 降水確率30%以上 または 雨予報
  if (maxPrecipProb >= 30 || anyRainCode) {
    items.push({
      id: 'wx-rainwear',
      title: 'レインウェア ＆ 防水スマホケース',
      subtitle: `最大降水確率 ${maxPrecipProb}%！傘は風で危険なため上下レインウェアが安全`,
      icon: 'rainwear',
      badgeText: `雨確率 ${maxPrecipProb}%`,
      checked: !!checkedMap['wx-rainwear'],
    });
  }

  // 4. 気温・晴天連動（暑さ・紫外線 / 防寒）
  if (forecast.tempMaxC >= 24 || decodeWmoWeather(forecast.weatherCode).kind === 'clear') {
    items.push({
      id: 'wx-sun-water',
      title: '多めの水分 ＆ 日焼け対策・偏光グラス',
      subtitle: `最高気温 ${forecast.tempMaxC}℃・海面の照り返し対策を万全に！`,
      icon: 'sunscreen',
      badgeText: `${forecast.tempMaxC}℃・UV`,
      checked: !!checkedMap['wx-sun-water'],
    });
  }

  if (forecast.tempMinC <= 13) {
    items.push({
      id: 'wx-warmth',
      title: '防寒グローブ・カイロ・ネックウォーマー',
      subtitle: `最低気温 ${forecast.tempMinC}℃！指先が冷えると糸結びが難しくなるので保温を`,
      icon: 'gloves',
      badgeText: `冷え込み ${forecast.tempMinC}℃`,
      checked: !!checkedMap['wx-warmth'],
    });
  }

  // 5. 波気・常時安全アイテム
  if (maxWave >= 0.7 || items.length < 3) {
    items.push({
      id: 'wx-safety-shoes',
      title: '滑りにくい靴 ＆ ライフジャケット確認',
      subtitle:
        maxWave >= 0.7
          ? `波高最大 ${maxWave}m 予報。濡れた堤防でも滑りにくいソールで安全第一！`
          : '快適で安全な釣行の基本セットを出発前にワンタップ確認！',
      icon: 'lifejacket',
      badgeText: '安全第一',
      checked: !!checkedMap['wx-safety-shoes'],
    });
  }

  let sonamaruAdvice = 'ピピッ！現地の天気と風に合わせて、忘れやすいアイテムをピックアップしたよっ！';
  if (maxWind >= 5.0 && maxPrecipProb >= 30) {
    sonamaruAdvice = `ピピッ⚠️ 風（最大${maxWind}m/s）と雨（${maxPrecipProb}%）に備えて「重めのオモリ」と「レインウェア」は絶対入れておこうね！`;
  } else if (maxWind >= 5.0) {
    sonamaruAdvice = `ピピッ💨 今日は最大${maxWind}m/sの風予報だよ！重めのオモリと防風ウェアがあると安心だよっ！`;
  } else if (maxPrecipProb >= 30) {
    sonamaruAdvice = `ピピッ☔ 降水確率${maxPrecipProb}%だよ！傘は使えないからレインウェアを準備してねっ！`;
  } else if (isNightOrMazume) {
    sonamaruAdvice = 'ピピッ✨ マズメ・暗くなる時間帯を狙うなら、ヘッドライトの点灯確認を忘れないでねっ！';
  }

  return { items, sonamaruAdvice };
}
