'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Check,
  Compass,
  Layers,
  LocateFixed,
  Navigation,
  Search,
  Star,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import { FISH_SCORING_CONFIG } from '@/config/fishScoringConfig';
import {
  MAP_REGION_SHORTCUTS,
  NATIONWIDE_SPOT_CATALOG,
} from '@/config/presetSpots';
import { useApp } from '@/context/AppContext';
import DirectionDial from '@/components/map/DirectionDial';
import type { MapTileMode } from '@/components/map/LeafletMapInner';
import {
  searchJapanPlacesOnline,
  searchLocalSpotCatalog,
} from '@/lib/geocoder';
import { evaluateAllGenresForDay } from '@/lib/scoringEngine';
import { calcDistanceKm, computeDailyTide, findNearestPort } from '@/lib/tideEngine';
import {
  buildEstimatedForecast,
  fetchSpotForecast,
  getJstDateString,
} from '@/lib/weatherApi';
import { decodeWmoWeather, degToCompassJa } from '@/lib/windUtils';
import { FishingSpot, SpotForecastBundle } from '@/types';

const LeafletMapInner = dynamic(() => import('@/components/map/LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-sm opacity-80">
      <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      <span>全国ソナーマップを起動中...</span>
    </div>
  ),
});

export default function MapView() {
  const {
    theme,
    mySpots,
    activeSpot,
    selectSpot,
    saveSpotToMySpots,
    setActiveTab,
    dayIndex,
  } = useApp();

  const [probeSpot, setProbeSpot] = useState<FishingSpot>(activeSpot);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    activeSpot.lat,
    activeSpot.lon,
  ]);
  const [mapZoom, setMapZoom] = useState<number>(11);
  const [flyTrigger, setFlyTrigger] = useState<number>(0);
  const [tileMode, setTileMode] = useState<MapTileMode>('gsi-pale');

  // 検索ステート
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<FishingSpot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // タップ地点のリアルタイム予報＆スコア速報
  const [probeForecast, setProbeForecast] = useState<SpotForecastBundle>(() =>
    buildEstimatedForecast(activeSpot.lat, activeSpot.lon)
  );
  const targetProbeKey = `${probeSpot.lat.toFixed(4)}_${probeSpot.lon.toFixed(4)}`;
  const [loadedProbeKey, setLoadedProbeKey] = useState<string>('');
  const isLoadingProbe = loadedProbeKey !== targetProbeKey;

  // マイスポット保存モーダル
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveSeaDir, setSaveSeaDir] = useState(180);
  const [justSavedToast, setJustSavedToast] = useState(false);

  // 調査地点変更時に天気取得
  useEffect(() => {
    let cancelled = false;
    const key = `${probeSpot.lat.toFixed(4)}_${probeSpot.lon.toFixed(4)}`;
    fetchSpotForecast(probeSpot.lat, probeSpot.lon).then((bundle) => {
      if (!cancelled) {
        setProbeForecast(bundle);
        setLoadedProbeKey(key);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [probeSpot.lat, probeSpot.lon]);

  // 内蔵カタログの0秒ローカルフィルタ（漢字・ひらがな・カタカナ・通称対応）
  const localMatches = useMemo(() => searchLocalSpotCatalog(query), [query]);

  // 国土地理院 ジオコーディングAPI ＋ Nominatim ハイブリッド検索（「〇〇漁港」等の接尾辞自動補完対応）
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const timeoutId = setTimeout(() => controller.abort(), 5500);
      try {
        const places = await searchJapanPlacesOnline(q, controller.signal);
        setRemoteResults(places);
      } catch {
        // オフライン時は内蔵辞書のみでスムーズに継続
      } finally {
        clearTimeout(timeoutId);
        setIsSearching(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const combinedResults = useMemo(() => {
    const seen = new Set<string>();
    const merged: FishingSpot[] = [];
    const effectiveRemote = query.trim().length >= 2 ? remoteResults : [];
    for (const item of [...localMatches, ...effectiveRemote]) {
      const key = `${item.lat.toFixed(2)}_${item.lon.toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
    return merged.slice(0, 10);
  }, [localMatches, query, remoteResults]);

  // マップ上の任意海辺タップ時
  const handleMapTap = useCallback(
    (lat: number, lon: number) => {
      // 近くに登録済みまたは内蔵スポットがあれば名称を引き継ぐ(1.2km以内)
      const allKnown = [...mySpots, ...NATIONWIDE_SPOT_CATALOG];
      let matchedSpot: FishingSpot | null = null;
      let bestDist = 1.2;
      for (const s of allKnown) {
        const d = calcDistanceKm(lat, lon, s.lat, s.lon);
        if (d < bestDist) {
          bestDist = d;
          matchedSpot = s;
        }
      }

      if (matchedSpot) {
        setProbeSpot(matchedSpot);
        return;
      }

      const { port } = findNearestPort(lat, lon);
      const shortPort = port.name.split('（')[0];
      // 最寄り港からの簡易方位から初期の海向きを推定
      const newSpot: FishingSpot = {
        id: `tap-${lat.toFixed(4)}-${lon.toFixed(4)}`,
        name: `${shortPort}周辺のポイント`,
        area: `${port.prefecture}（${lat.toFixed(3)}, ${lon.toFixed(3)}）`,
        lat,
        lon,
        seaDirectionDeg: 180,
      };
      setProbeSpot(newSpot);
    },
    [mySpots]
  );

  const handleJumpToSpot = (spot: FishingSpot, zoom = 13) => {
    setProbeSpot(spot);
    setMapCenter([spot.lat, spot.lon]);
    setMapZoom(zoom);
    setFlyTrigger((n) => n + 1);
    setSearchFocused(false);
    setQuery('');
  };

  // 現在地ジャンプ
  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        const { port } = findNearestPort(lat, lon);
        const currSpot: FishingSpot = {
          id: `gps-${lat.toFixed(4)}-${lon.toFixed(4)}`,
          name: '現在地周辺のポイント',
          area: `${port.prefecture}・現在地`,
          lat,
          lon,
          seaDirectionDeg: 180,
        };
        handleJumpToSpot(currSpot, 13);
      },
      () => {
        // 位置情報拒否時は大阪湾全体へフォーカス
        setMapCenter([34.61, 135.12]);
        setMapZoom(10);
        setFlyTrigger((n) => n + 1);
      },
      { timeout: 6000 }
    );
  };

  const cycleTileMode = () => {
    setTileMode((prev) =>
      prev === 'gsi-pale' ? 'osm' : prev === 'osm' ? 'gsi-photo' : 'gsi-pale'
    );
  };

  // タップ地点の総合スコア算出
  const probeSummary = useMemo(() => {
    const safeDay = Math.min(dayIndex, probeForecast.days.length - 1);
    const dayWeather =
      probeForecast.days[safeDay] ??
      buildEstimatedForecast(probeSpot.lat, probeSpot.lon).days[0];
    const dateStr = dayWeather.dateStr || getJstDateString(safeDay);
    const tide = computeDailyTide(probeSpot.lat, probeSpot.lon, dateStr);
    const evals = evaluateAllGenresForDay(dayWeather, tide, probeSpot);
    const sorted = Object.values(evals).sort((a, b) => b.peakScore - a.peakScore);
    const best = sorted[0];
    const bestCfg = FISH_SCORING_CONFIG[best.genreId];
    const peakHourWeather = dayWeather.hourly[best.peakHour] ?? dayWeather.hourly[6];
    const wmo = decodeWmoWeather(peakHourWeather.weatherCode);

    return {
      bestScore: best.peakScore,
      bestGenreName: bestCfg.shortName,
      bestWindowLabel: best.bestWindow.label,
      tideName: tide.tideName,
      portName: tide.port.name,
      weatherLabel: wmo.label,
      windSpeedMs: peakHourWeather.windSpeedMs,
      waveHeightM: peakHourWeather.waveHeightM,
    };
  }, [dayIndex, probeForecast, probeSpot]);

  const isAlreadySaved = mySpots.some(
    (s) =>
      s.id === probeSpot.id ||
      (Math.abs(s.lat - probeSpot.lat) < 0.001 &&
        Math.abs(s.lon - probeSpot.lon) < 0.001)
  );

  const openSaveModal = () => {
    setSaveName(probeSpot.name);
    setSaveSeaDir(probeSpot.seaDirectionDeg);
    setSaveModalOpen(true);
  };

  const confirmSaveSpot = () => {
    const finalSpot: FishingSpot = {
      ...probeSpot,
      id: isAlreadySaved
        ? probeSpot.id
        : `myspot-${Date.now()}`,
      name: saveName.trim() || probeSpot.name,
      seaDirectionDeg: saveSeaDir,
    };
    saveSpotToMySpots(finalSpot);
    setProbeSpot(finalSpot);
    setSaveModalOpen(false);
    setJustSavedToast(true);
    setTimeout(() => setJustSavedToast(false), 2400);
  };

  return (
    <div className="relative w-full h-[calc(100dvh-136px)] min-h-[520px] rounded-3xl overflow-hidden border"
      style={{ borderColor: 'var(--glass-border)' }}
    >
      {/* Leaflet本体 */}
      <LeafletMapInner
        center={mapCenter}
        zoom={mapZoom}
        flyTrigger={flyTrigger}
        selectedPos={[probeSpot.lat, probeSpot.lon]}
        mySpots={mySpots}
        tileMode={tileMode}
        theme={theme}
        onMapTap={handleMapTap}
        onSelectSavedSpot={(s) => setProbeSpot(s)}
      />

      {/* 上部オーバーレイ: 検索バー＋現在地＋タイル切替＋エリアショートカット */}
      <div
        className="absolute top-3 left-3 right-3 z-20 space-y-2 pointer-events-none"
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative flex-1">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSearchFocused(true);
                if (combinedResults.length > 0) {
                  handleJumpToSpot(combinedResults[0], 14);
                  return;
                }
                const q = query.trim();
                if (!q) return;
                setIsSearching(true);
                const ctrl = new AbortController();
                const tId = setTimeout(() => ctrl.abort(), 5500);
                try {
                  const places = await searchJapanPlacesOnline(q, ctrl.signal);
                  setRemoteResults(places);
                  if (places.length > 0) {
                    handleJumpToSpot(places[0], 14);
                  }
                } finally {
                  clearTimeout(tId);
                  setIsSearching(false);
                }
              }}
              className="glass-panel-strong rounded-full h-11 px-3.5 flex items-center gap-2"
            >
              <Search className="w-4 h-4 shrink-0 opacity-75" />
              <input
                id="map-search-input"
                type="search"
                enterKeyHint="search"
                value={query}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="漁港・港・地名を検索（例：炬口漁港、たけのくち）"
                className="w-full bg-transparent text-sm outline-none placeholder:opacity-60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setRemoteResults([]);
                  }}
                  className="p-1 opacity-70 hover:opacity-100"
                  aria-label="検索文字をクリア"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* 検索サジェスト一覧 */}
            {searchFocused && query.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-2xl glass-panel-strong p-1.5 max-h-64 overflow-y-auto shadow-2xl">
                {isSearching && combinedResults.length === 0 && (
                  <div className="px-3 py-2.5 text-xs opacity-75">
                    全国の漁港・地名データを検索中...
                  </div>
                )}
                {!isSearching && combinedResults.length === 0 && (
                  <div className="px-3 py-2.5 text-xs opacity-75">
                    候補が見つかりません。市町村名（例：洲本市）や地図タップでも調査できます！
                  </div>
                )}
                {combinedResults.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => handleJumpToSpot(spot, 14)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-cyan-500/15 transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{spot.name}</div>
                      <div className="text-[11px] opacity-70 truncate">{spot.area}</div>
                    </div>
                    <Navigation className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 現在地ジャンプボタン */}
          <button
            id="map-locate-btn"
            type="button"
            onClick={handleLocateMe}
            className="glass-panel-strong w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:scale-95"
            title="現在地へジャンプ"
            aria-label="現在地へジャンプ"
          >
            <LocateFixed className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
          </button>

          {/* 地図タイル切替ボタン */}
          <button
            id="map-layer-btn"
            type="button"
            onClick={cycleTileMode}
            className="glass-panel-strong h-11 px-3 rounded-full flex items-center gap-1 text-[11px] font-bold shrink-0 active:scale-95"
            title="地図タイル切替（地理院 / OSM / 航空写真）"
          >
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
            <span>
              {tileMode === 'gsi-pale'
                ? '地理院'
                : tileMode === 'osm'
                ? 'OSM'
                : '写真'}
            </span>
          </button>
        </div>

        {/* 全国エリアワンタップ移動チップ */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto pb-0.5">
          {MAP_REGION_SHORTCUTS.map((reg) => (
            <button
              key={reg.label}
              type="button"
              onClick={() => {
                setMapCenter([reg.lat, reg.lon]);
                setMapZoom(reg.zoom);
                setFlyTrigger((n) => n + 1);
                setSearchFocused(false);
              }}
              className="glass-panel px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 active:scale-95"
            >
              {reg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 保存完了ミニトースト */}
      {justSavedToast && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 glass-panel-strong px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 border border-amber-400/60">
          <Check className="w-4 h-4 text-amber-400" />
          <span>マイスポットに保存しました！</span>
        </div>
      )}

      {/* 下部クリアボトムシート（モックアップ準拠：スポット名・スコア速報・詳しく見る・★保存） */}
      <div className="absolute bottom-3 left-3 right-3 z-20 glass-panel-strong rounded-3xl p-4 space-y-3">
        <div className="w-10 h-1 rounded-full bg-cyan-400/40 mx-auto -mt-1" />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-extrabold truncate">{probeSpot.name}</h2>
              {isAlreadySaved && (
                <Star className="w-4 h-4 shrink-0 fill-amber-400 text-amber-400" />
              )}
            </div>
            <p className="text-[11px] opacity-75 truncate">
              基準港：{probeSummary.portName}（{probeSummary.tideName}）・海向き：
              {degToCompassJa(probeSpot.seaDirectionDeg)}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[11px] font-bold opacity-75">最高スコア速報</div>
            <div
              className="text-2xl font-black leading-tight"
              style={{
                color:
                  probeSummary.bestScore >= 80
                    ? 'var(--accent-gold)'
                    : 'var(--accent-cyan)',
              }}
            >
              {isLoadingProbe ? '...' : `${probeSummary.bestScore}点`}
            </div>
          </div>
        </div>

        {/* 速報ステータスバッジ列 */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="glass-pill px-2.5 py-1 rounded-full font-bold">
            🎯 {probeSummary.bestGenreName}（{probeSummary.bestWindowLabel}）
          </span>
          <span className="glass-pill px-2.5 py-1 rounded-full flex items-center gap-1">
            <span>{probeSummary.weatherLabel}</span>
          </span>
          <span className="glass-pill px-2.5 py-1 rounded-full flex items-center gap-1">
            <Wind className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
            <span>{probeSummary.windSpeedMs}m/s</span>
          </span>
          <span className="glass-pill px-2.5 py-1 rounded-full flex items-center gap-1">
            <Waves className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
            <span>波 {probeSummary.waveHeightM}m</span>
          </span>
        </div>

        {/* アクションボタン2列 */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <button
            id="map-detail-btn"
            type="button"
            onClick={() => {
              selectSpot(probeSpot);
              setActiveTab('home');
            }}
            className="glow-button-cyan py-3 px-4 rounded-2xl text-sm font-extrabold transition active:scale-98"
          >
            詳しく見る
          </button>

          <button
            id="map-save-spot-btn"
            type="button"
            onClick={openSaveModal}
            className="glass-pill py-3 px-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-1.5 hover:bg-amber-400/15 transition active:scale-98"
          >
            <Star
              className={`w-4 h-4 ${
                isAlreadySaved ? 'fill-amber-400 text-amber-400' : 'text-amber-400'
              }`}
            />
            <span>{isAlreadySaved ? '方角・名前編集' : 'マイスポット保存'}</span>
          </button>
        </div>
      </div>

      {/* マイスポット保存＆海の方角コンパス設定モーダル */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ background: 'var(--modal-backdrop)' }}
        >
          <div className="glass-panel-strong w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center gap-1.5">
                <Compass className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
                マイスポットに保存
              </h3>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="glass-pill w-8 h-8 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold block">スポット名</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="例：岩屋港 赤灯台・東向き波止"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--glass-border)',
                }}
              />
            </div>

            <DirectionDial valueDeg={saveSeaDir} onChange={setSaveSeaDir} />

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="glass-pill py-3 rounded-2xl text-xs font-bold"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmSaveSpot}
                className="glow-button-cyan py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                この設定で保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
