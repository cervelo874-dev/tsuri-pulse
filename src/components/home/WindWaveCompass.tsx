'use client';

import React, { useState } from 'react';
import {
  CloudRain,
  Compass,
  SlidersHorizontal,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import DirectionDial from '@/components/map/DirectionDial';
import { decodeWmoWeather, evaluateWindRelation } from '@/lib/windUtils';

/**
 * 風向き・波高ビジュアル（モックアップ下段の2カラム構成）
 * - 左カード：風向判定（追い風◎ / 横風△ / 向かい風✕）、風速(m/s)、波高(m)、過去24h雨量
 * - 右カード：海の方角と現在の風向矢印を重ねた円形コンパスUI
 */
export default function WindWaveCompass() {
  const {
    activeSpot,
    dailyWeather,
    selectedHour,
    updateSpotSeaDirection,
  } = useApp();

  const [editDirOpen, setEditDirOpen] = useState(false);

  const wx = dailyWeather.hourly[selectedHour] ?? dailyWeather.hourly[0];
  const wmo = decodeWmoWeather(wx.weatherCode);
  const windJudge = evaluateWindRelation(
    wx.windDirectionDeg,
    wx.windSpeedMs,
    activeSpot.seaDirectionDeg
  );

  const statusColor =
    windJudge.shortStatus === '◎'
      ? 'var(--accent-emerald)'
      : windJudge.shortStatus === '△'
      ? 'var(--accent-amber)'
      : 'var(--accent-coral)';

  return (
    <section aria-label="風向きと波高コンパス" className="grid grid-cols-12 gap-3">
      {/* 左側: 風速・波高・追い風/向かい風判定サマリー */}
      <div className="col-span-7 glass-panel rounded-3xl p-4 flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-extrabold opacity-80">
            {String(selectedHour).padStart(2, '0')}:00 の風・海況
          </span>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-black border"
            style={{
              color: statusColor,
              borderColor: statusColor,
              background: 'rgba(15, 23, 42, 0.18)',
            }}
          >
            {windJudge.badgeLabel}
          </span>
        </div>

        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-1.5">
            <Wind className="w-6 h-6" style={{ color: statusColor }} />
            <div>
              <div className="text-2xl font-black leading-none">
                {wx.windSpeedMs.toFixed(1)}
                <span className="text-xs font-bold ml-0.5">m/s</span>
              </div>
              <div className="text-[11px] font-bold opacity-75 mt-0.5">
                {windJudge.windFromLabel}
              </div>
            </div>
          </div>

          <div className="pl-3 border-l border-cyan-400/20">
            <div className="flex items-center gap-1 text-sm font-black">
              <Waves className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              <span>{wx.waveHeightM.toFixed(1)}m</span>
            </div>
            <div className="text-[10px] font-bold opacity-75">波高目安</div>
          </div>
        </div>

        <p className="text-[11px] leading-snug opacity-85">
          {windJudge.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-bold opacity-85">
          <span className="glass-pill px-2 py-0.5 rounded-full flex items-center gap-1">
            <CloudRain className="w-3 h-3 text-sky-400" />
            過去24h雨：{wx.past24hPrecipMm}mm
          </span>
          <span className="glass-pill px-2 py-0.5 rounded-full">
            {wmo.label}・{wx.pressureHpa}hPa
          </span>
        </div>
      </div>

      {/* 右側: 風向き×海の方角コンパスビジュアル */}
      <div className="col-span-5 glass-panel rounded-3xl p-3.5 flex flex-col items-center justify-between">
        <div className="w-full flex items-center justify-between text-xs font-extrabold">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
            風コンパス
          </span>
          <button
            type="button"
            onClick={() => setEditDirOpen(true)}
            className="glass-pill px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 hover:bg-cyan-500/15"
            title="この釣り場の海の方角を調整"
          >
            <SlidersHorizontal className="w-2.5 h-2.5" />
            <span>海:{windJudge.seaFacingLabel.replace('向き', '')}</span>
          </button>
        </div>

        {/* コンパスSVG */}
        <svg viewBox="0 0 140 140" className="w-28 h-28 my-1 overflow-visible">
          <circle
            cx="70"
            cy="70"
            r="56"
            fill="rgba(6, 24, 44, 0.28)"
            stroke="var(--glass-border-strong)"
            strokeWidth="2"
          />
          <circle
            cx="70"
            cy="70"
            r="38"
            fill="none"
            stroke="var(--radar-grid)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* スポットの海の方角（青い海扇形） */}
          <g transform={`rotate(${activeSpot.seaDirectionDeg} 70 70)`}>
            <path
              d="M 70 70 L 32 28 A 56 56 0 0 1 108 28 Z"
              fill="rgba(34, 211, 238, 0.22)"
              stroke="rgba(34, 211, 238, 0.55)"
              strokeWidth="1.2"
            />
            <text
              x="70"
              y="32"
              textAnchor="middle"
              fontSize="9"
              fontWeight="800"
              fill="var(--accent-cyan)"
            >
              海側
            </text>
          </g>

          {/* 4方位ラベル */}
          <text x="70" y="11" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--text-primary)">
            N
          </text>
          <text x="132" y="74" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--text-primary)">
            E
          </text>
          <text x="70" y="137" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--text-primary)">
            S
          </text>
          <text x="8" y="74" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--text-primary)">
            W
          </text>

          {/* 風の進行方向矢印（風が吹いていく向きへ矢印先端が向く） */}
          <g
            transform={`rotate(${windJudge.windBlowingToDeg} 70 70)`}
            style={{ transition: 'transform 300ms ease-out' }}
          >
            <line
              x1="70"
              y1="98"
              x2="70"
              y2="30"
              stroke={statusColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polygon
              points="70,19 61,36 79,36"
              fill={statusColor}
            />
            <circle cx="70" cy="98" r="3.5" fill={statusColor} opacity="0.7" />
          </g>

          {/* 中心点 */}
          <circle cx="70" cy="70" r="4.5" fill="#ffffff" />
        </svg>

        <div className="text-[10px] font-bold opacity-75 text-center">
          青エリア＝海側 ／ 矢印＝風の向き
        </div>
      </div>

      {/* 海の方角クイック調整モーダル */}
      {editDirOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ background: 'var(--modal-backdrop)' }}
        >
          <div className="glass-panel-strong w-full max-w-sm rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">
                「{activeSpot.name}」の海の方角を調整
              </h3>
              <button
                type="button"
                onClick={() => setEditDirOpen(false)}
                className="glass-pill w-8 h-8 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DirectionDial
              valueDeg={activeSpot.seaDirectionDeg}
              onChange={(deg) => updateSpotSeaDirection(activeSpot.id, deg)}
            />
            <button
              type="button"
              onClick={() => setEditDirOpen(false)}
              className="w-full glow-button-cyan py-2.5 rounded-2xl text-xs font-extrabold"
            >
              完了
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
