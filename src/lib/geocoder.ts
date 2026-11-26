import { NATIONWIDE_SPOT_CATALOG } from '@/config/presetSpots';
import { FishingSpot } from '@/types';

/** カタカナをひらがなに統一して表記ゆれ（タケノクチ / たけのくち 等）を吸収 */
export function normalizeJaSearchText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/[\u30a1-\u30f6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
}

/**
 * 「〇〇漁港」「〇〇海釣り公園」「〇〇防波堤」などで検索した際、
 * 地図データ上は「〇〇（地名）」として登録されているケースを救済するためベース地名も抽出する
 */
const FISHING_SUFFIX_REGEX =
  /(漁港|海釣り公園|海づり公園|海づり施設|魚つり公園|魚つり園|釣り公園|海釣りテラス|新波止|大波止|赤灯台|白灯台|防波堤|一文字|波止|突堤|護岸|人工島|ケーソン|ベランダ|テラス|親水公園|海浜公園|臨海公園|コンビナート|海水浴場|海岸|ふ頭|埠頭|新港|本港|港)$/;

export function buildSearchQueryVariants(rawQuery: string): string[] {
  const q = rawQuery.trim();
  if (!q) return [];
  const variants = [q];
  const stripped = q.replace(FISHING_SUFFIX_REGEX, '').trim();
  if (stripped.length >= 2 && stripped !== q) {
    variants.push(stripped);
  }
  return variants;
}

/** 内蔵釣り場カタログからの即時0秒ローカル検索（漢字・ひらがな・カタカナ・通称対応） */
export function searchLocalSpotCatalog(rawQuery: string): FishingSpot[] {
  const normQ = normalizeJaSearchText(rawQuery);
  if (!normQ) return [];

  const variants = buildSearchQueryVariants(rawQuery).map(normalizeJaSearchText);

  const scored: { spot: FishingSpot; priority: number }[] = [];
  for (const spot of NATIONWIDE_SPOT_CATALOG) {
    const haystack = normalizeJaSearchText(
      `${spot.name} ${spot.area} ${spot.keywords ?? ''}`
    );
    const nameNorm = normalizeJaSearchText(spot.name);

    if (nameNorm.startsWith(normQ)) {
      scored.push({ spot, priority: 3 });
    } else if (nameNorm.includes(normQ)) {
      scored.push({ spot, priority: 2 });
    } else if (haystack.includes(normQ)) {
      scored.push({ spot, priority: 1 });
    } else if (
      variants.length > 1 &&
      variants[1].length >= 2 &&
      haystack.includes(variants[1])
    ) {
      scored.push({ spot, priority: 0.5 });
    }
  }

  return scored
    .sort((a, b) => b.priority - a.priority)
    .map((x) => x.spot)
    .slice(0, 8);
}

interface GsiAddressFeature {
  geometry?: {
    coordinates?: [number, number]; // [lon, lat]
  };
  properties?: {
    title?: string;
  };
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

async function fetchGsiPlaces(
  q: string,
  originalUserQuery: string,
  signal: AbortSignal
): Promise<FishingSpot[]> {
  try {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const features = (await res.json()) as GsiAddressFeature[];
    if (!Array.isArray(features)) return [];

    return features.slice(0, 8).flatMap((f, idx) => {
      const coords = f.geometry?.coordinates;
      const title = f.properties?.title?.trim();
      if (!coords || coords.length < 2 || !title) return [];
      const lon = Math.round(Number(coords[0]) * 10000) / 10000;
      const lat = Math.round(Number(coords[1]) * 10000) / 10000;
      if (Number.isNaN(lat) || Number.isNaN(lon)) return [];

      // 接尾辞（「漁港」等）を除いてヒットした場合は、ユーザーの検索意図が分かりやすい見出しにする
      const displayTitle =
        q !== originalUserQuery && !title.includes(originalUserQuery)
          ? `${originalUserQuery}（${title}）`
          : title;

      return [
        {
          id: `gsi-${q}-${idx}-${lat}-${lon}`,
          name: displayTitle,
          area: `国土地理院データ（${title}）`,
          lat,
          lon,
          seaDirectionDeg: 180,
        },
      ];
    });
  } catch {
    return [];
  }
}

async function fetchNominatimPlaces(
  q: string,
  originalUserQuery: string,
  signal: AbortSignal
): Promise<FishingSpot[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=jp&limit=5&q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url, {
      signal,
      headers: { 'Accept-Language': 'ja' },
    });
    if (!res.ok) return [];
    const items = (await res.json()) as NominatimResult[];
    if (!Array.isArray(items)) return [];

    return items.map((it) => {
      const parts = it.display_name.split(',').map((p) => p.trim());
      const primary = parts[0] || q;
      const name =
        q !== originalUserQuery && !primary.includes(originalUserQuery)
          ? `${originalUserQuery}（${primary}）`
          : primary;
      return {
        id: `nom-${it.place_id}`,
        name,
        area: parts.slice(1, 4).reverse().join(' '),
        lat: Math.round(Number(it.lat) * 10000) / 10000,
        lon: Math.round(Number(it.lon) * 10000) / 10000,
        seaDirectionDeg: 180,
      };
    });
  } catch {
    return [];
  }
}

/**
 * 国土地理院 ジオコーディングAPI ＋ OpenStreetMap Nominatim のハイブリッド検索
 * 「炬口漁港」のように「漁港」付きの文字列でも、そのままの語と「炬口」の両方で確実にヒットさせる
 */
export async function searchJapanPlacesOnline(
  rawQuery: string,
  signal: AbortSignal
): Promise<FishingSpot[]> {
  const variants = buildSearchQueryVariants(rawQuery);
  if (variants.length === 0) return [];

  const primaryQ = variants[0];
  const [gsiPrimary, nomPrimary] = await Promise.all([
    fetchGsiPlaces(primaryQ, rawQuery.trim(), signal),
    fetchNominatimPlaces(primaryQ, rawQuery.trim(), signal),
  ]);

  let combined = [...gsiPrimary, ...nomPrimary];

  // 「〇〇漁港」「〇〇海釣り公園」等のフル文字列でヒットが少ない場合は「〇〇」でも自動再検索
  if (combined.length < 3 && variants.length > 1) {
    const fallbackQ = variants[1];
    const [gsiFallback, nomFallback] = await Promise.all([
      fetchGsiPlaces(fallbackQ, rawQuery.trim(), signal),
      fetchNominatimPlaces(fallbackQ, rawQuery.trim(), signal),
    ]);
    combined = [...combined, ...gsiFallback, ...nomFallback];
  }

  return combined;
}
