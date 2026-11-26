'use client';

import React, { useCallback, useRef } from 'react';
import { degToCompassJa } from '@/lib/windUtils';

interface DirectionDialProps {
  valueDeg: number;
  onChange: (deg: number) => void;
}

const QUICK_DIRECTIONS = [
  { label: '北', deg: 0 },
  { label: '北東', deg: 45 },
  { label: '東', deg: 90 },
  { label: '南東', deg: 135 },
  { label: '南', deg: 180 },
  { label: '南西', deg: 225 },
  { label: '西', deg: 270 },
  { label: '北西', deg: 315 },
];

/**
 * マイスポット保存・編集モーダル用の「海の方角（どちらを向いて竿を出すか）」円形コンパスダイヤル
 */
export default function DirectionDial({ valueDeg, onChange }: DirectionDialProps) {
  const dialRef = useRef<SVGSVGElement | null>(null);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = dialRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      // 北(上: dy<0, dx=0) = 0°, 東(右: dx>0, dy=0) = 90°
      const rad = Math.atan2(dx, -dy);
      const deg = Math.round((((rad * 180) / Math.PI) + 360) % 360);
      onChange(deg);
    },
    [onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold">海の方角（堤防から海を見る向き）</span>
        <span
          className="px-2.5 py-0.5 rounded-full font-extrabold glass-pill"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {degToCompassJa(valueDeg)}（{valueDeg}°）
        </span>
      </div>

      <div className="flex flex-col items-center">
        <svg
          ref={dialRef}
          viewBox="0 0 180 180"
          className="w-40 h-40 touch-none cursor-pointer select-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) {
              updateFromPointer(e.clientX, e.clientY);
            }
          }}
        >
          {/* 外周リング */}
          <circle
            cx="90"
            cy="90"
            r="76"
            fill="rgba(8, 28, 52, 0.35)"
            stroke="var(--glass-border-strong)"
            strokeWidth="2"
          />

          {/* 海側扇形ハイライト (±50°) */}
          <g transform={`rotate(${valueDeg} 90 90)`}>
            <path
              d="M 90 90 L 38 32 A 76 76 0 0 1 142 32 Z"
              fill="rgba(34, 211, 238, 0.25)"
              stroke="rgba(34, 211, 238, 0.65)"
              strokeWidth="1.5"
            />
            {/* キャスト方向矢印 */}
            <line
              x1="90"
              y1="90"
              x2="90"
              y2="24"
              stroke="var(--accent-cyan)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <polygon points="90,14 82,29 98,29" fill="var(--accent-cyan)" />
            <text
              x="90"
              y="48"
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="var(--text-primary)"
            >
              海🌊
            </text>
          </g>

          {/* 方位文字 */}
          <text x="90" y="16" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">
            N
          </text>
          <text x="166" y="94" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">
            E
          </text>
          <text x="90" y="172" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">
            S
          </text>
          <text x="14" y="94" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">
            W
          </text>

          {/* 中心の釣り人ドット */}
          <circle cx="90" cy="90" r="7" fill="var(--accent-gold)" />
        </svg>
        <p className="text-[11px] opacity-75 text-center mt-1">
          円をなぞるか、下の方角ボタンで「海に向かって投げる向き」を選べます
        </p>
      </div>

      {/* 8方位ワンタップボタン */}
      <div className="grid grid-cols-4 gap-1.5">
        {QUICK_DIRECTIONS.map((d) => {
          const active = Math.abs(valueDeg - d.deg) <= 10;
          return (
            <button
              key={d.deg}
              type="button"
              onClick={() => onChange(d.deg)}
              className={`py-1.5 rounded-xl text-xs font-bold transition ${
                active ? 'glow-button-cyan' : 'glass-pill opacity-80 hover:opacity-100'
              }`}
            >
              {d.label}向き
            </button>
          );
        })}
      </div>
    </div>
  );
}
