'use client';

import React from 'react';
import { FISH_GENRE_LIST } from '@/config/fishScoringConfig';
import { useApp } from '@/context/AppContext';
import { FishGenreId } from '@/types';

function FishGenreSilhouette({ genreId, color }: { genreId: FishGenreId; color: string }) {
  if (genreId === 'aoriika') {
    return (
      <svg viewBox="0 0 28 18" className="w-5 h-3.5 shrink-0" fill={color}>
        <path d="M2,9 L11,3 L19,6 L26,5 L23,9 L26,13 L19,12 L11,15 Z" />
      </svg>
    );
  }
  if (genreId === 'tachiuo') {
    return (
      <svg viewBox="0 0 30 14" className="w-5 h-3.5 shrink-0" fill={color}>
        <path d="M1,7 L7,3 L28,6.5 L29,7.5 L7,11 Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 16" className="w-5 h-3.5 shrink-0" fill={color}>
      <path d="M2,8 C6,2 15,2 21,7 L27,3 L25,8 L27,13 L21,9 C15,14 6,14 2,8 Z" />
    </svg>
  );
}

/**
 * 6ジャンル横スクロール魚種タブ
 * - 当日ピークスコア 80点以上: ネオンゴールド枠 / 65〜79点: ネオンシアン枠 / 64点以下: 通常クリア枠
 * - 65点以上の狙い目上位3魚種に順位バッジ (1 / 2 / 3) を付与（全64点以下なら非表示）
 */
export default function FishTabs() {
  const { selectedGenre, setSelectedGenre, genreEvaluations } = useApp();

  return (
    <section aria-label="ターゲット魚種切替" className="pt-1">
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 px-1">
        {FISH_GENRE_LIST.map((cfg) => {
          const evalItem = genreEvaluations[cfg.id];
          const peak = evalItem?.peakScore ?? 0;
          const rank = evalItem?.topRankBadge ?? null;
          const isSelected = selectedGenre === cfg.id;

          const glowClass =
            peak >= 80
              ? 'glow-gold'
              : peak >= 65
              ? 'glow-cyan'
              : '';

          const rankBg =
            rank === 1
              ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950'
              : rank === 2
              ? 'bg-gradient-to-br from-cyan-200 to-cyan-400 text-slate-950'
              : 'bg-gradient-to-br from-orange-300 to-amber-600 text-slate-950';

          return (
            <button
              key={cfg.id}
              id={`fish-tab-${cfg.id}`}
              type="button"
              onClick={() => setSelectedGenre(cfg.id)}
              className={`relative shrink-0 rounded-full px-3.5 py-2 flex items-center gap-1.5 text-xs transition-all active:scale-95 ${
                isSelected
                  ? 'glass-panel-strong font-extrabold scale-[1.03]'
                  : 'glass-pill font-bold opacity-85 hover:opacity-100'
              } ${glowClass}`}
            >
              {/* 狙い目TOP3順位バッジ（65点以上のみ表示） */}
              {rank !== null && (
                <span
                  className={`absolute -top-2 -left-1 min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-md ${rankBg}`}
                  title={`本日のおすすめ第${rank}位（最高${peak}点）`}
                >
                  {rank}
                </span>
              )}

              <FishGenreSilhouette genreId={cfg.id} color={cfg.accentColor} />
              <span className="whitespace-nowrap">{cfg.fullName}</span>
              <span
                className="text-[11px] font-black ml-0.5 opacity-90"
                style={{
                  color:
                    peak >= 80
                      ? 'var(--accent-gold)'
                      : peak >= 65
                      ? 'var(--accent-cyan)'
                      : 'var(--text-dim)',
                }}
              >
                {peak}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
