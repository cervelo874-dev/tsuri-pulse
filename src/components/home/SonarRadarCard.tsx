'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  ChevronDown,
  Clock,
  Flame,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { FISH_SCORING_CONFIG } from '@/config/fishScoringConfig';
import { useApp } from '@/context/AppContext';
import Sonamaru from '@/components/character/Sonamaru';

interface SonarRadarCardProps {
  onOpenStrategy: () => void;
}

/**
 * 結論エリア：左に発光ソナーレーダーゲージ（デフォルト現在時刻／タイドグラフ指定時刻の得点＆順位と完全連動）
 * 右にソナまる（8表情透過PNG）＋吹き出し＋AI作戦会議ボタン
 */
export default function SonarRadarCard({ onOpenStrategy }: SonarRadarCardProps) {
  const {
    selectedGenre,
    selectedHour,
    jumpToPeakHour,
    isManualHour,
    resetToAutoHour,
    isLoadingForecast,
    hourlyRankMap,
    currentGenreEval,
    currentHourScore,
  } = useApp();

  const [showTranslation, setShowTranslation] = useState(false);

  const cfg = FISH_SCORING_CONFIG[selectedGenre];
  const score = currentHourScore.total;
  const bestWindow = currentGenreEval.bestWindow;
  const rankBadge = hourlyRankMap[selectedGenre];

  // 半円ソナーゲージ (180度: 左端-90°〜右端+90°) の角度算出
  const sweepAngleDeg = (score / 100) * 180;
  const endRad = Math.PI - (sweepAngleDeg * Math.PI) / 180;
  const cx = 95;
  const cy = 92;
  const r = 72;
  const xEnd = cx + r * Math.cos(endRad);
  const yEnd = cy - r * Math.sin(endRad);
  const largeArc = sweepAngleDeg > 180 ? 1 : 0;

  const radarColor = currentHourScore.safetyWarning
    ? '#fb7185'
    : score >= 80
    ? '#fbbf24'
    : '#22d3ee';

  const effectiveMood = isLoadingForecast
    ? 'analyzing'
    : currentHourScore.sonamaruMood;

  return (
    <section aria-label="釣れやすさ結論レーダー" className="space-y-2.5">
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* 左側: 発光ソナーレーダーカード（タップで初心者通訳パネル展開） */}
        <div
          id="sonar-radar-card"
          role="button"
          tabIndex={0}
          onClick={() => setShowTranslation((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowTranslation((v) => !v);
            }
          }}
          className="col-span-7 glass-panel rounded-3xl p-3.5 relative flex flex-col items-center justify-between cursor-pointer transition-all hover:border-cyan-300/60 active:scale-[0.99]"
        >
          {/* 表示中時刻のTOP3リボンバッジ（上部タブの順位バッジと完全同期） */}
          {rankBadge !== null && (
            <div
              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow"
              style={{
                background:
                  rankBadge === 1
                    ? 'linear-gradient(135deg, #fde047, #f59e0b)'
                    : rankBadge === 2
                    ? 'linear-gradient(135deg, #67e8f9, #0284c7)'
                    : 'linear-gradient(135deg, #fdba74, #d97706)',
                color: '#041529',
              }}
            >
              <Award className="w-3 h-3" />
              <span>いま {rankBadge}位</span>
            </div>
          )}

          {/* 時刻インジケーター（デフォルト＝現在時刻、タイドグラフ操作時＝選択時刻） */}
          <div className="w-full flex items-center justify-end gap-1 text-[10px] font-bold">
            <span
              className={`px-2 py-0.5 rounded-full ${
                isManualHour
                  ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                  : 'glass-pill opacity-90'
              }`}
            >
              {isManualHour
                ? `📍 ${String(selectedHour).padStart(2, '0')}:00 選択中`
                : `🕒 現在 ${String(selectedHour).padStart(2, '0')}:00`}
            </span>
          </div>

          {/* 発光ソナーSVGゲージ */}
          <div className="relative w-full max-w-[188px] -mt-1">
            <svg viewBox="0 0 190 106" className="w-full h-auto overflow-visible">
              <defs>
                <radialGradient id="sonarSweepGrad" cx="50%" cy="90%" r="80%">
                  <stop offset="0%" stopColor={radarColor} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={radarColor} stopOpacity="0.52" />
                </radialGradient>
              </defs>

              {[26, 49, 72].map((rad) => (
                <path
                  key={rad}
                  d={`M ${cx - rad} ${cy} A ${rad} ${rad} 0 0 1 ${cx + rad} ${cy}`}
                  fill="none"
                  stroke="var(--radar-grid)"
                  strokeWidth="1.2"
                />
              ))}

              {[30, 60, 90, 120, 150].map((deg) => {
                const radAngle = (deg * Math.PI) / 180;
                const lx = cx + r * Math.cos(radAngle);
                const ly = cy - r * Math.sin(radAngle);
                return (
                  <line
                    key={deg}
                    x1={cx}
                    y1={cy}
                    x2={lx}
                    y2={ly}
                    stroke="var(--radar-grid)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                );
              })}

              <line
                x1={cx - r - 4}
                y1={cy}
                x2={cx + r + 4}
                y2={cy}
                stroke="var(--radar-grid)"
                strokeWidth="1.4"
              />

              {score > 0 && (
                <path
                  d={`M ${cx} ${cy} L ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${xEnd} ${yEnd} Z`}
                  fill="url(#sonarSweepGrad)"
                />
              )}

              {score > 0 && (
                <path
                  d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${xEnd} ${yEnd}`}
                  fill="none"
                  stroke={radarColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 8px ${radarColor})` }}
                />
              )}

              <line
                x1={cx}
                y1={cy}
                x2={xEnd}
                y2={yEnd}
                stroke={radarColor}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx={xEnd} cy={yEnd} r="4" fill={radarColor} />
            </svg>

            {/* スコア数値オーバーレイ */}
            <div className="text-center -mt-7">
              <div className="flex items-baseline justify-center gap-0.5">
                <span
                  className="text-4xl font-black tracking-tight"
                  style={{
                    color: radarColor,
                    textShadow: `0 0 18px ${radarColor}55`,
                  }}
                >
                  {score}
                </span>
                <span className="text-sm font-extrabold opacity-85">点</span>
              </div>

              <div className="flex items-center justify-center gap-1 mt-0.5 min-h-[18px]">
                {currentHourScore.safetyWarning ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/25 text-rose-300 border border-rose-400/50 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    安全ブレーカー作動
                  </span>
                ) : currentHourScore.auxiliaryBadge ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-400/50"
                    style={{ color: 'var(--accent-emerald)' }}
                  >
                    {currentHourScore.auxiliaryBadge}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold opacity-75">
                    {cfg.shortName}（本日最高 {currentGenreEval.peakScore}点）
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 今日のベストタイム表示（タップでベスト時刻へジャンプ可） */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              jumpToPeakHour();
            }}
            title="タップするとこのベスト時間のスコア・ランキングを表示します"
            className="w-full mt-2 pt-2 border-t border-cyan-400/20 text-center rounded-xl hover:bg-cyan-500/10 transition py-0.5"
          >
            <div className="text-[10px] font-bold opacity-75 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" style={{ color: 'var(--accent-cyan)' }} />
              <span>おすすめの時間（タップで表示）</span>
            </div>
            <div className="text-sm font-black tracking-tight mt-0.5">
              {bestWindow.label}
            </div>
          </div>

          {/* 初心者通訳タップ誘導 */}
          <div
            className="mt-1.5 flex items-center gap-1 text-[10px] font-bold opacity-80"
            style={{ color: 'var(--accent-cyan)' }}
          >
            <HelpCircle className="w-3 h-3" />
            <span>理由をやさしく解説</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                showTranslation ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* 右側: ソナまる＋1〜2行吹き出し＋AI作戦会議ボタン */}
        <div className="col-span-5 flex flex-col justify-between items-center gap-2">
          <div className="relative w-full glass-panel rounded-2xl p-2.5 text-[11px] font-bold leading-snug">
            <p className="line-clamp-3">{currentHourScore.sonamaruComment}</p>
            <span
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            />
          </div>

          <div className="my-0.5">
            <Sonamaru mood={effectiveMood} size="md" />
          </div>

          <div className="w-full space-y-1.5">
            <button
              id="ai-strategy-btn"
              type="button"
              onClick={onOpenStrategy}
              className="w-full glow-button-cyan py-2.5 px-3 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>AI作戦会議</span>
            </button>

            {isManualHour ? (
              <button
                type="button"
                onClick={resetToAutoHour}
                className="w-full glass-pill py-1.5 px-2 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 opacity-90 hover:opacity-100"
              >
                <RotateCcw className="w-3 h-3" />
                <span>現在の時刻へ戻す</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={jumpToPeakHour}
                className="w-full glass-pill py-1.5 px-2 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 opacity-85 hover:opacity-100"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span>
                  ベスト({String(currentGenreEval.peakHour).padStart(2, '0')}時/{currentGenreEval.peakScore}点)を見る
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* スコア詳細（初心者通訳パネル）：すりガラス展開 */}
      {showTranslation && (
        <div className="glass-panel-strong rounded-3xl p-4 space-y-3.5 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              なぜ {score}点 なの？（初心者通訳パネル）
            </h3>
            <span className="text-[11px] font-bold opacity-75">
              {String(selectedHour).padStart(2, '0')}:00 の内訳
            </span>
          </div>

          <p className="text-xs font-bold leading-relaxed px-3 py-2 rounded-2xl glass-pill">
            {currentHourScore.translation.headline}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {currentHourScore.reasonTags.map((tag, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                  tag.impact === 'warning'
                    ? 'bg-rose-500/20 border-rose-400/60 text-rose-300'
                    : tag.impact === 'negative'
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                    : 'bg-cyan-500/15 border-cyan-400/50'
                }`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              {
                label: '① 時間帯・光量',
                val: currentHourScore.subScores.time,
                max: currentHourScore.subScores.maxTime,
              },
              {
                label: '② 潮の動き',
                val: currentHourScore.subScores.tide,
                max: currentHourScore.subScores.maxTide,
              },
              {
                label: '③ 天候・過去雨',
                val: currentHourScore.subScores.weather,
                max: currentHourScore.subScores.maxWeather,
              },
              {
                label: '④ 風・波の穏やかさ',
                val: currentHourScore.subScores.windWave,
                max: currentHourScore.subScores.maxWindWave,
              },
            ].map((bar) => {
              const pct = Math.round((bar.val / Math.max(1, bar.max)) * 100);
              return (
                <div key={bar.label} className="glass-pill rounded-xl p-2.5 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>{bar.label}</span>
                    <span>
                      {bar.val}/{bar.max}点
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-500/25 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background:
                          pct >= 75
                            ? 'var(--accent-cyan)'
                            : pct >= 50
                            ? 'var(--accent-gold)'
                            : 'var(--accent-coral)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 text-xs leading-relaxed">
            <div>
              <span className="font-extrabold" style={{ color: 'var(--accent-cyan)' }}>
                🕒 時間帯：
              </span>
              <span className="opacity-90">{currentHourScore.translation.timeNote}</span>
            </div>
            <div>
              <span className="font-extrabold" style={{ color: 'var(--accent-cyan)' }}>
                🌊 潮の動き：
              </span>
              <span className="opacity-90">{currentHourScore.translation.tideNote}</span>
            </div>
            <div>
              <span className="font-extrabold" style={{ color: 'var(--accent-cyan)' }}>
                ☔ 天候・過去24hの雨：
              </span>
              <span className="opacity-90">{currentHourScore.translation.weatherNote}</span>
            </div>
            <div>
              <span className="font-extrabold" style={{ color: 'var(--accent-cyan)' }}>
                💨 風向きと波：
              </span>
              <span className="opacity-90">{currentHourScore.translation.windNote}</span>
            </div>
          </div>

          <div className="rounded-2xl p-3 border border-cyan-400/40 bg-cyan-500/10 text-xs">
            <div className="font-extrabold mb-0.5" style={{ color: 'var(--accent-gold)' }}>
              💡 ソナまるからの「次の一手」
            </div>
            <p className="leading-relaxed font-semibold">
              {currentHourScore.translation.nextAction}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
