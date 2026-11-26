'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { FISH_GENRE_LIST, FISH_SCORING_CONFIG } from '@/config/fishScoringConfig';
import { buildWeatherLinkedGear } from '@/config/gearPresets';
import Sonamaru from '@/components/character/Sonamaru';
import { useApp } from '@/context/AppContext';
import { GearChecklistItem, GearIconType } from '@/types';

/** モックアップのネオン線画アイコンを再現するカスタムSVG */
function GearNeonIcon({ icon }: { icon: GearIconType }) {
  switch (icon) {
    case 'sinker':
      return (
        <svg viewBox="0 0 40 40" className="w-9 h-9 shrink-0" fill="none">
          <circle cx="29" cy="10" r="3.5" stroke="#fb7185" strokeWidth="2.2" />
          <path
            d="M26 13 C18 17, 11 25, 13 31 C15 35, 22 34, 27 26 C30 20, 29 15, 26 13 Z"
            stroke="#fb7185"
            strokeWidth="2.2"
            fill="rgba(251,113,133,0.14)"
          />
        </svg>
      );
    case 'headlight':
      return (
        <svg viewBox="0 0 40 40" className="w-9 h-9 shrink-0" fill="none">
          <rect
            x="7"
            y="14"
            width="20"
            height="14"
            rx="4"
            stroke="#34d399"
            strokeWidth="2.2"
            fill="rgba(52,211,153,0.14)"
          />
          <circle cx="19" cy="21" r="4" stroke="#34d399" strokeWidth="2" />
          <line x1="30" y1="15" x2="36" y2="11" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="31" y1="21" x2="37" y2="21" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="30" y1="27" x2="36" y2="31" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'rainwear':
    case 'windbreaker':
      return (
        <svg viewBox="0 0 40 40" className="w-9 h-9 shrink-0" fill="none">
          <path
            d="M15 9 L20 13 L25 9 L33 15 L30 22 L27 20 L27 33 L13 33 L13 20 L10 22 L7 15 Z"
            stroke="#22d3ee"
            strokeWidth="2.1"
            strokeLinejoin="round"
            fill="rgba(34,211,238,0.14)"
          />
          <line x1="20" y1="13" x2="20" y2="33" stroke="#22d3ee" strokeWidth="1.8" />
        </svg>
      );
    case 'sabiki':
    case 'lure':
    case 'egi':
      return (
        <svg viewBox="0 0 40 40" className="w-9 h-9 shrink-0" fill="none">
          <path
            d="M10 31 C16 24, 22 18, 29 9"
            stroke="#a78bfa"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M20 20 L25 23 C27 25, 25 29, 22 27"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M14 26 L19 29 C21 31, 19 35, 16 33"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 40" className="w-9 h-9 shrink-0" fill="none">
          <rect
            x="9"
            y="13"
            width="22"
            height="17"
            rx="4"
            stroke="#38bdf8"
            strokeWidth="2.2"
            fill="rgba(56,189,248,0.14)"
          />
          <path d="M15 13 V10 H25 V13" stroke="#38bdf8" strokeWidth="2" />
          <line x1="9" y1="19" x2="31" y2="19" stroke="#38bdf8" strokeWidth="1.8" />
        </svg>
      );
  }
}

function GearCardRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GearChecklistItem;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      role="checkbox"
      aria-checked={item.checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`glass-panel rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
        item.checked ? 'opacity-65' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* カスタム発光チェックボックス */}
        <div
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
            item.checked
              ? 'bg-cyan-400 border-cyan-300 text-slate-950'
              : 'border-cyan-400/50 bg-cyan-500/10'
          }`}
        >
          {item.checked && <Check className="w-4 h-4 stroke-[3]" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-extrabold ${
                item.checked ? 'line-through opacity-75' : ''
              }`}
            >
              {item.title}
            </span>
            {item.badgeText && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full glass-pill"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {item.badgeText}
              </span>
            )}
          </div>
          {item.subtitle && (
            <p className="text-[11px] opacity-75 mt-0.5 leading-snug">
              {item.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {item.isCustom && onDelete ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/15"
            aria-label={`${item.title}を削除`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <GearNeonIcon icon={item.icon} />
        )}
      </div>
    </div>
  );
}

export default function GearView() {
  const {
    dailyWeather,
    selectedHour,
    selectedGenre,
    setSelectedGenre,
    gearState,
    weatherGearChecked,
    toggleGenreGearItem,
    addCustomGearItem,
    removeCustomGearItem,
    resetGenreGearChecks,
    toggleWeatherGearItem,
    currentHourScore,
  } = useApp();

  const [customTitle, setCustomTitle] = useState('');

  const { items: weatherItems, sonamaruAdvice } = useMemo(
    () =>
      buildWeatherLinkedGear(
        dailyWeather,
        selectedHour,
        selectedGenre,
        weatherGearChecked
      ),
    [dailyWeather, selectedGenre, selectedHour, weatherGearChecked]
  );

  const genreItems = gearState[selectedGenre] ?? [];
  const totalCount = weatherItems.length + genreItems.length;
  const checkedCount =
    weatherItems.filter((i) => i.checked).length +
    genreItems.filter((i) => i.checked).length;

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    addCustomGearItem(selectedGenre, customTitle);
    setCustomTitle('');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* タイトル＆進捗バー */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-black tracking-tight">持ち物チェック</h2>
          <p className="text-xs opacity-75">
            準備完了：{checkedCount} / {totalCount} アイテム
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetGenreGearChecks(selectedGenre)}
          className="glass-pill px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>チェックをリセット</span>
        </button>
      </div>

      {/* 上部：ソナまるのミニアドバイス */}
      <div className="flex items-center gap-3">
        <Sonamaru mood={currentHourScore.sonamaruMood} size="sm" />
        <div className="flex-1 glass-panel rounded-2xl p-3 text-xs font-bold leading-relaxed">
          {sonamaruAdvice}
        </div>
      </div>

      {/* 1. 状況連動ピックアップ（天気・風・時間帯から自動生成） */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold" style={{ color: 'var(--accent-cyan)' }}>
          <Sparkles className="w-4 h-4" />
          <span>予報連動ピックアップ（自動提案）</span>
        </div>

        <div className="space-y-2.5">
          {weatherItems.map((item) => (
            <GearCardRow
              key={item.id}
              item={item}
              onToggle={() => toggleWeatherGearItem(item.id)}
            />
          ))}
        </div>
      </section>

      {/* 2. 魚種別カスタムチェックリスト */}
      <section className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold opacity-90">
            魚種別の基本装備セット（{FISH_SCORING_CONFIG[selectedGenre].shortName}）
          </h3>
        </div>

        {/* 6ジャンル切替ピル */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {FISH_GENRE_LIST.map((g) => {
            const active = selectedGenre === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGenre(g.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                  active ? 'glow-button-cyan font-extrabold' : 'glass-pill opacity-80'
                }`}
              >
                {g.shortName}
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5">
          {genreItems.map((item) => (
            <GearCardRow
              key={item.id}
              item={item}
              onToggle={() => toggleGenreGearItem(selectedGenre, item.id)}
              onDelete={
                item.isCustom
                  ? () => removeCustomGearItem(selectedGenre, item.id)
                  : undefined
              }
            />
          ))}
        </div>

        {/* 自分用の持ち物追加フォーム */}
        <form onSubmit={handleAddCustom} className="flex gap-2 pt-2">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="自分用の持ち物を追加（例：タオル、おにぎり）"
            className="flex-1 rounded-2xl px-3.5 py-2.5 text-xs border outline-none"
            style={{
              background: 'var(--input-bg)',
              borderColor: 'var(--glass-border)',
            }}
          />
          <button
            type="submit"
            className="glow-button-cyan px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>追加</span>
          </button>
        </form>
      </section>
    </div>
  );
}
