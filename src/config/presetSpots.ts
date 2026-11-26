import { FishingSpot } from '@/types';

/**
 * 初期プリセット・マイスポット（関西圏の代表的な人気釣り場4選）
 */
export const INITIAL_PRESET_SPOTS: FishingSpot[] = [
  {
    id: 'preset-iwaya',
    name: '岩屋港',
    area: '淡路島北部・明石海峡',
    lat: 34.5906,
    lon: 135.0211,
    seaDirectionDeg: 110, // 東南東（大阪湾側）
    isPreset: true,
    description: '明石海峡の潮通し抜群！アジ・青物・メバル・タチウオまで魚影濃厚な人気港',
  },
  {
    id: 'preset-minamiashiya',
    name: '南芦屋浜（ベランダ）',
    area: '兵庫県芦屋市・阪神間',
    lat: 34.7061,
    lon: 135.3082,
    seaDirectionDeg: 180, // 南向き
    isPreset: true,
    description: '足場が良くファミリー・初心者にも安心！サビキ・チヌ・タチウオの定番護岸',
  },
  {
    id: 'preset-tsubasa',
    name: '翼港（東浦）',
    area: '淡路島東岸',
    lat: 34.5492,
    lon: 135.0065,
    seaDirectionDeg: 115, // 東南東向き
    isPreset: true,
    description: '大型青物やサゴシ・マダイ・アジの回遊が狙える潮通しの良い海釣りスポット',
  },
  {
    id: 'preset-azur-maiko',
    name: 'アジュール舞子',
    area: '神戸市垂水区',
    lat: 34.6295,
    lon: 135.0365,
    seaDirectionDeg: 185, // 南向き（明石海峡大橋側）
    isPreset: true,
    description: '明石海峡大橋を望む絶景護岸。サビキ・青物・アオリイカ・根魚まで多彩に狙える',
  },
];

/**
 * 全国主要釣り場・海辺の地名クイック検索辞書（オフライン・即時サジェスト用）
 * Nominatim API検索と併用し、0秒での候補表示を実現する
 */
export const NATIONWIDE_SPOT_CATALOG: FishingSpot[] = [
  ...INITIAL_PRESET_SPOTS,
  // 関西圏追加
  {
    id: 'cat-mukogawa',
    name: '尼崎魚つり公園（武庫川河口）',
    area: '兵庫県尼崎市',
    lat: 34.6902,
    lon: 135.3742,
    seaDirectionDeg: 195,
  },
  {
    id: 'cat-sumagaihama',
    name: '須磨海づり公園周辺',
    area: '神戸市須磨区',
    lat: 34.6382,
    lon: 135.1065,
    seaDirectionDeg: 180,
  },
  {
    id: 'cat-akashiko',
    name: '明石港（新波止・役所裏）',
    area: '兵庫県明石市',
    lat: 34.6408,
    lon: 134.9912,
    seaDirectionDeg: 185,
  },
  {
    id: 'cat-sumotoko',
    name: '洲本港（白灯台）',
    area: '淡路島・洲本市',
    lat: 34.3448,
    lon: 134.9042,
    seaDirectionDeg: 75,
  },
  {
    id: 'cat-maruyama',
    name: '丸山海釣り公園',
    area: '淡路島南西部',
    lat: 34.2654,
    lon: 134.6612,
    seaDirectionDeg: 255,
  },
  {
    id: 'cat-nankou',
    name: '大阪南港魚つり園護岸',
    area: '大阪市住之江区',
    lat: 34.6145,
    lon: 135.4055,
    seaDirectionDeg: 250,
  },
  {
    id: 'cat-tottopark',
    name: 'とっとパーク小島・谷川港',
    area: '大阪府岬町',
    lat: 34.3106,
    lon: 135.1185,
    seaDirectionDeg: 315,
  },
  {
    id: 'cat-wakayama-marina',
    name: '和歌山マリーナシティ海釣り公園',
    area: '和歌山県和歌山市',
    lat: 34.1528,
    lon: 135.1774,
    seaDirectionDeg: 235,
  },
  {
    id: 'cat-maizuru-shinhama',
    name: '舞鶴親海公園',
    area: '京都府舞鶴市',
    lat: 35.5245,
    lon: 135.3945,
    seaDirectionDeg: 350,
  },
  // 関東・東海
  {
    id: 'cat-wakasu',
    name: '若洲海浜公園（東京湾）',
    area: '東京都江東区',
    lat: 35.6164,
    lon: 139.8375,
    seaDirectionDeg: 145,
  },
  {
    id: 'cat-daikoku',
    name: '大黒海づり施設',
    area: '神奈川県横浜市',
    lat: 35.4586,
    lon: 139.6962,
    seaDirectionDeg: 130,
  },
  {
    id: 'cat-enoshima',
    name: '江の島（湘南大堤防）',
    area: '神奈川県藤沢市',
    lat: 35.3005,
    lon: 139.4858,
    seaDirectionDeg: 155,
  },
  {
    id: 'cat-shimizu',
    name: '清水港（折戸・三保）',
    area: '静岡県静岡市',
    lat: 35.0024,
    lon: 138.5192,
    seaDirectionDeg: 85,
  },
  {
    id: 'cat-toyohama',
    name: '豊浜釣り桟橋（知多半島）',
    area: '愛知県南知多町',
    lat: 34.7038,
    lon: 136.9325,
    seaDirectionDeg: 215,
  },
  {
    id: 'cat-yokkaichi',
    name: '霞ヶ浦緑地（四日市）',
    area: '三重県四日市市',
    lat: 34.9882,
    lon: 136.6625,
    seaDirectionDeg: 115,
  },
  // 瀬戸内・中国・四国・九州・北日本・沖縄
  {
    id: 'cat-shimotsui',
    name: '下津井港（瀬戸大橋）',
    area: '岡山県倉敷市',
    lat: 34.4352,
    lon: 133.8035,
    seaDirectionDeg: 180,
  },
  {
    id: 'cat-hakata',
    name: '福岡市海づり公園（博多湾）',
    area: '福岡県福岡市西区',
    lat: 33.6285,
    lon: 130.2254,
    seaDirectionDeg: 65,
  },
  {
    id: 'cat-kagoshima',
    name: '鴨池海づり公園（錦江湾）',
    area: '鹿児島県鹿児島市',
    lat: 31.5562,
    lon: 130.5625,
    seaDirectionDeg: 110,
  },
  {
    id: 'cat-sendai',
    name: '仙台港（向洋海浜公園）',
    area: '宮城県七ヶ浜町',
    lat: 38.2682,
    lon: 141.0355,
    seaDirectionDeg: 135,
  },
  {
    id: 'cat-otaru',
    name: '小樽港（南防波堤）',
    area: '北海道小樽市',
    lat: 43.1895,
    lon: 141.0215,
    seaDirectionDeg: 60,
  },
  {
    id: 'cat-naha',
    name: '那覇うみそら公園周辺',
    area: '沖縄県那覇市',
    lat: 26.2185,
    lon: 127.6625,
    seaDirectionDeg: 290,
  },
];

export const MAP_REGION_SHORTCUTS = [
  { label: '大阪湾・淡路', lat: 34.61, lon: 135.14, zoom: 10 },
  { label: '和歌山・紀北', lat: 34.18, lon: 135.16, zoom: 10 },
  { label: '東京湾・湘南', lat: 35.45, lon: 139.68, zoom: 10 },
  { label: '伊勢・知多', lat: 34.82, lon: 136.85, zoom: 10 },
  { label: '瀬戸内', lat: 34.4, lon: 133.8, zoom: 9 },
  { label: '博多・北九州', lat: 33.64, lon: 130.35, zoom: 10 },
  { label: '北海道', lat: 43.18, lon: 141.0, zoom: 9 },
  { label: '沖縄', lat: 26.22, lon: 127.68, zoom: 11 },
];
