'use client';

import React, { useState } from 'react';
import { SonamaruMood } from '@/types';

interface SonamaruProps {
  mood: SonamaruMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onTap?: () => void;
}

const MOOD_IMAGE_MAP: Record<SonamaruMood, string> = {
  normal: '/images/sonamaru/normal.png',
  excited: '/images/sonamaru/excited.png',
  caution: '/images/sonamaru/caution.png',
  analyzing: '/images/sonamaru/analyzing.png',
  celebration: '/images/sonamaru/celebration.png',
  sleepy: '/images/sonamaru/sleepy.png',
  mazume: '/images/sonamaru/mazume.png',
  checklist: '/images/sonamaru/checklist.png',
};

/**
 * AI相棒キャラクター「ソナまる（SONA-01）」全8表情対応
 * - public/images/sonamaru/*.png の透過PNGを優先描画
 * - 万が一画像が未配置の場合でも8表情連動オリジナルSVGへ自動フォールバック
 * - ふわふわ浮遊アニメーション ＆ タップで跳ねる演出つき
 */
export default function Sonamaru({
  mood,
  size = 'md',
  className = '',
  onTap,
}: SonamaruProps) {
  const [missingImages, setMissingImages] = useState<Record<string, boolean>>({});
  const [hopping, setHopping] = useState(false);
  const [pipiPop, setPipiPop] = useState(false);

  const imgSrc = MOOD_IMAGE_MAP[mood];
  const useSvgFallback = !!missingImages[mood];

  const sizeClass =
    size === 'sm'
      ? 'w-16 h-16'
      : size === 'lg'
      ? 'w-28 h-28'
      : 'w-24 h-24';

  const handleClick = () => {
    setHopping(true);
    setPipiPop(true);
    setTimeout(() => setHopping(false), 600);
    setTimeout(() => setPipiPop(false), 1100);
    onTap?.();
  };

  const glowColor =
    mood === 'excited'
      ? '#fbbf24'
      : mood === 'mazume'
      ? '#fb923c'
      : mood === 'caution'
      ? '#fb7185'
      : mood === 'celebration' || mood === 'checklist'
      ? '#34d399'
      : mood === 'sleepy'
      ? '#60a5fa'
      : '#22d3ee';

  const popText =
    mood === 'caution'
      ? 'ピピッ!?'
      : mood === 'celebration'
      ? 'やったね♪'
      : mood === 'sleepy'
      ? 'むにゃ…💤'
      : mood === 'mazume'
      ? '時合い🔥'
      : mood === 'checklist'
      ? '準備ヨシ✓'
      : 'ピピッ♪';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="AI相棒ソナまる"
      className={`relative inline-flex items-center justify-center select-none cursor-pointer focus:outline-none ${sizeClass} ${className}`}
    >
      {pipiPop && (
        <span
          className="absolute -top-3 right-0 z-20 px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg pointer-events-none animate-bounce"
          style={{
            background: glowColor,
            color: '#041529',
          }}
        >
          {popText}
        </span>
      )}

      <div
        className={`w-full h-full flex items-center justify-center ${
          hopping ? 'animate-sonamaru-hop' : 'animate-sonamaru-float'
        }`}
        style={{
          filter: `drop-shadow(0 8px 16px ${glowColor}50)`,
        }}
      >
        {!useSvgFallback ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imgSrc}
            alt={`ソナまる (${mood})`}
            className="w-full h-full object-contain"
            onError={() =>
              setMissingImages((prev) => ({ ...prev, [mood]: true }))
            }
          />
        ) : (
          <svg
            viewBox="0 0 140 140"
            className="w-full h-full overflow-visible"
            role="img"
            aria-label={`ソナまる ${mood}`}
          >
            <ellipse
              cx="66"
              cy="76"
              rx="45"
              ry="40"
              fill="#e0f7ff"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            <rect
              x="26"
              y="54"
              width="62"
              height="42"
              rx="20"
              fill="#061a2e"
              stroke={glowColor}
              strokeWidth="2.4"
            />
            <path
              d="M 37 74 Q 43 66 49 74 M 65 74 Q 71 66 77 74"
              fill="none"
              stroke={glowColor}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
