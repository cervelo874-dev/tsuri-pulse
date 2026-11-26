'use client';

import React from 'react';
import {
  Clock,
  Compass,
  Crosshair,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import Sonamaru from '@/components/character/Sonamaru';
import { SonamaruMood, StrategyPlan } from '@/types';

interface StrategyModalProps {
  open: boolean;
  loading: boolean;
  plan: StrategyPlan | null;
  mood: SonamaruMood;
  onRefresh: () => void;
  onClose: () => void;
}

export default function StrategyModal({
  open,
  loading,
  plan,
  mood,
  onRefresh,
  onClose,
}: StrategyModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'var(--modal-backdrop)' }}
    >
      <div className="glass-panel-strong w-full max-w-md rounded-3xl p-5 max-h-[88dvh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
            <h2 className="text-base font-extrabold">ソナまる AI作戦会議</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-pill w-8 h-8 rounded-full flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ソナまる＋ヘッドライン吹き出し */}
        <div className="flex items-center gap-3 glass-panel rounded-2xl p-3">
          <Sonamaru mood={loading ? 'analyzing' : mood} size="sm" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full glass-pill"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {loading
                  ? 'ソナーデータ解析中...'
                  : plan?.source === 'gemini'
                  ? '✨ Gemini AI 作戦（3hキャッシュ）'
                  : '⚡ ソナまる戦術エンジン（無料・即時）'}
              </span>
            </div>
            <p className="text-xs font-bold leading-relaxed">
              {loading
                ? 'ピピッ！潮の流れ・風向き・過去24時間の雨量を統合して今日のベスト戦術を組み立ててるよっ...'
                : plan?.headline}
            </p>
          </div>
        </div>

        {!loading && plan && (
          <div className="space-y-3">
            <div className="glass-panel rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
                <Clock className="w-4 h-4" />
                勝負の時間帯・立ち回り
              </div>
              <p className="text-xs leading-relaxed opacity-90">{plan.targetTiming}</p>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: 'var(--accent-gold)' }}>
                <Crosshair className="w-4 h-4" />
                おすすめ仕掛け ＆ タナ（深さ）攻略
              </div>
              <p className="text-xs leading-relaxed opacity-90">{plan.tackleAndRange}</p>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
                <Compass className="w-4 h-4" />
                潮回り ＆ 風向き対策アドバイス
              </div>
              <p className="text-xs leading-relaxed opacity-90">{plan.windAndTideTip}</p>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 space-y-1 border border-amber-400/35">
              <div className="text-xs font-extrabold flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                安全・装備チェック
              </div>
              <p className="text-xs leading-relaxed opacity-90">{plan.safetyNote}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onRefresh}
            className="glass-pill py-2.5 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            最新時刻で再作成
          </button>

          <button
            type="button"
            onClick={onClose}
            className="glow-button-cyan py-2.5 px-6 rounded-2xl text-xs font-extrabold"
          >
            了解！釣り場へGO
          </button>
        </div>
      </div>
    </div>
  );
}
