'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  Compass,
  MapPin,
  Moon,
  RefreshCw,
  Settings,
  Star,
  Sun,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { degToCompassJa } from '@/lib/windUtils';

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

function formatShortDateLabel(dateStr: string, idx: number): { main: string; sub: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const wd = WEEKDAYS_JA[dt.getUTCDay()];
  const md = `${m}/${d}(${wd})`;
  if (idx === 0) return { main: '今日', sub: md };
  if (idx === 1) return { main: '明日', sub: md };
  return { main: `${idx}日後`, sub: md };
}

interface HeaderProps {
  onOpenSettings: () => void;
}

export default function Header({ onOpenSettings }: HeaderProps) {
  const {
    theme,
    toggleTheme,
    activeTab,
    setActiveTab,
    mySpots,
    activeSpot,
    selectSpot,
    dayIndex,
    setDayIndex,
    dailyTide,
    isLoadingForecast,
    forecastSource,
    refreshForecast,
  } = useApp();

  const [spotMenuOpen, setSpotMenuOpen] = useState(false);

  const isSavedInMySpots = mySpots.some(
    (s) =>
      s.id === activeSpot.id ||
      (Math.abs(s.lat - activeSpot.lat) < 0.001 &&
        Math.abs(s.lon - activeSpot.lon) < 0.001)
  );

  // 今日〜3日後の日付リスト作成（dailyWeather基準でSSR/CSR完全一致させる）
  const dateButtons = [0, 1, 2, 3].map((idx) => {
    const [by, bm, bd] = (dailyTide.dateStr || '2026-05-01').split('-').map(Number);
    // 現在選択中のdayIndexを逆算して今日(idx=0)の基準日を得る
    const todayUtcMs =
      Date.UTC(by || 2026, (bm || 5) - 1, bd || 1) - dayIndex * 86400 * 1000;
    const target = new Date(todayUtcMs + idx * 86400 * 1000);
    const ds = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`;
    return { idx, ...formatShortDateLabel(ds, idx) };
  });

  return (
    <header className="sticky top-0 z-30 pt-3 pb-2 px-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        {/* 左側: スポット切替ドロップダウン（または画面タイトル） */}
        <div className="relative min-w-0 flex-1">
          <button
            id="spot-selector-btn"
            type="button"
            onClick={() => setSpotMenuOpen((v) => !v)}
            className="group flex items-center gap-1.5 max-w-full py-1.5 px-2.5 -ml-1 rounded-2xl transition-all active:scale-98 hover:bg-cyan-500/10"
            aria-expanded={spotMenuOpen}
          >
            <MapPin
              className="w-5 h-5 shrink-0"
              style={{ color: 'var(--accent-cyan)' }}
            />
            <h1 className="text-xl font-extrabold tracking-tight truncate">
              {activeSpot.name}
            </h1>
            {isSavedInMySpots && (
              <Star
                className="w-4 h-4 shrink-0 fill-amber-400 text-amber-400"
                aria-label="マイスポット登録済み"
              />
            )}
            <ChevronDown
              className={`w-4 h-4 shrink-0 opacity-75 transition-transform ${
                spotMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* マイスポット切替ポップオーバー */}
          {spotMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSpotMenuOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-72 max-w-[86vw] rounded-2xl glass-panel-strong p-2 z-50 shadow-2xl">
                <div className="px-2.5 py-1.5 text-xs font-bold opacity-75 flex items-center justify-between">
                  <span>マイスポット切替</span>
                  <span>海向き方位</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {mySpots.map((spot) => {
                    const isSelected = spot.id === activeSpot.id;
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => {
                          selectSpot(spot);
                          setSpotMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'glow-button-cyan font-bold'
                            : 'hover:bg-cyan-500/10'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 shrink-0 fill-amber-400 text-amber-400" />
                            <span className="truncate">{spot.name}</span>
                          </div>
                          <div className="text-[11px] opacity-75 truncate">
                            {spot.area}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full glass-pill flex items-center gap-1">
                          <Compass className="w-3 h-3" />
                          {degToCompassJa(spot.seaDirectionDeg)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-cyan-400/20">
                  <button
                    type="button"
                    onClick={() => {
                      setSpotMenuOpen(false);
                      setActiveTab('map');
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-center glass-pill hover:bg-cyan-500/15 transition"
                    style={{ color: 'var(--accent-cyan)' }}
                  >
                    ＋ 全国マップから別の海辺を選ぶ
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 右側: ☀️/🌙 ワンタップテーマ切替 ＋ 更新 ＋ 設定 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            className="glass-pill h-10 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95"
            title={
              theme === 'night'
                ? 'サンライトモード（日中屋外向け）へ切替'
                : 'ナイト／標準モードへ切替'
            }
            aria-label="テーマ切替"
          >
            <Sun
              className={`w-4 h-4 transition-all ${
                theme === 'sunlight'
                  ? 'text-amber-500 scale-110'
                  : 'opacity-45'
              }`}
            />
            <span className="opacity-40">/</span>
            <Moon
              className={`w-4 h-4 transition-all ${
                theme === 'night'
                  ? 'text-cyan-300 scale-110'
                  : 'opacity-45'
              }`}
            />
          </button>

          <button
            id="settings-open-btn"
            type="button"
            onClick={onOpenSettings}
            className="glass-pill w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
            aria-label="設定とデータバックアップ"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ホーム・持ち物画面では日付切替バー＆潮名バッジを表示 */}
      {(activeTab === 'home' || activeTab === 'gear') && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {dateButtons.map((d) => {
              const active = dayIndex === d.idx;
              return (
                <button
                  key={d.idx}
                  id={`date-tab-${d.idx}`}
                  type="button"
                  onClick={() => setDayIndex(d.idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all shrink-0 flex items-center gap-1 ${
                    active
                      ? 'glow-button-cyan font-extrabold'
                      : 'glass-pill opacity-80 hover:opacity-100 font-semibold'
                  }`}
                >
                  <span>{d.main}</span>
                  <span className="text-[11px] opacity-80">{d.sub}</span>
                </button>
              );
            })}
          </div>

          {/* 潮名＋データ取得ステータス */}
          <button
            type="button"
            onClick={() => refreshForecast()}
            className="shrink-0 glass-pill px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 active:scale-95"
            title="最新の気象データを再取得"
          >
            <span style={{ color: 'var(--accent-cyan)' }}>{dailyTide.tideName}</span>
            <RefreshCw
              className={`w-3 h-3 opacity-70 ${
                isLoadingForecast ? 'animate-spin' : ''
              }`}
            />
            {forecastSource === 'estimated' && (
              <span className="text-[10px] opacity-65">推定</span>
            )}
          </button>
        </div>
      )}
    </header>
  );
}
