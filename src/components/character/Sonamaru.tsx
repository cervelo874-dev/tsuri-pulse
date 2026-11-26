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
};

/**
 * AI相棒キャラクター「ソナまる（SONA-01）」
 * - public/images/sonamaru/*.png が配置されていれば優先表示
 * - 未配置時は丸い白×クリアボディ・紅白玉ウキアンテナ・LED液晶フェイスのオリジナルSVGを5表情連動で描画
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

  // 表情別の発光アクセントカラー
  const glowColor =
    mood === 'excited'
      ? '#fbbf24'
      : mood === 'caution'
      ? '#fb7185'
      : mood === 'celebration'
      ? '#34d399'
      : '#22d3ee';

  const eyeStroke =
    mood === 'excited'
      ? '#fde047'
      : mood === 'caution'
      ? '#fda4af'
      : '#38f2ff';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="AI相棒ソナまる"
      className={`relative inline-flex items-center justify-center select-none cursor-pointer focus:outline-none ${sizeClass} ${className}`}
    >
      {/* タップ時の「ピピッ♪」ミニポップ演出 */}
      {pipiPop && (
        <span
          className="absolute -top-3 right-0 z-20 px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg pointer-events-none animate-bounce"
          style={{
            background: glowColor,
            color: '#041529',
          }}
        >
          {mood === 'caution' ? 'ピピッ!?' : mood === 'celebration' ? 'やったね♪' : 'ピピッ♪'}
        </span>
      )}

      <div
        className={`w-full h-full flex items-center justify-center ${
          hopping ? 'animate-sonamaru-hop' : 'animate-sonamaru-float'
        }`}
        style={{
          filter: `drop-shadow(0 8px 16px ${glowColor}55)`,
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
          /* 可愛い高精細オリジナルSVGソナまる（モックアップ忠実再現） */
          <svg
            viewBox="0 0 140 140"
            className="w-full h-full overflow-visible"
            role="img"
            aria-label={`ソナまる ${mood}`}
          >
            <defs>
              <radialGradient id={`sonaBody-${mood}`} cx="38%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="58%" stopColor="#e0f7ff" />
                <stop offset="100%" stopColor="#8be4ff" />
              </radialGradient>

              <linearGradient id={`sonaVisor-${mood}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#082038" />
                <stop offset="100%" stopColor="#030d1a" />
              </linearGradient>

              <linearGradient id={`sonaFin-${mood}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={glowColor} stopOpacity="0.88" />
                <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            {/* お祝い時のキラキラ星エフェクト */}
            {(mood === 'celebration' || mood === 'excited') && (
              <g fill={mood === 'excited' ? '#fde047' : '#34d399'}>
                <polygon points="18,30 21,36 28,37 22,41 24,48 18,44 12,48 14,41 8,37 15,36" />
                <circle cx="122" cy="28" r="3.5" />
                <circle cx="16" cy="96" r="2.8" />
              </g>
            )}

            {/* 分析中の回転ソナーリング */}
            {mood === 'analyzing' && (
              <circle
                cx="68"
                cy="76"
                r="54"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeDasharray="12 8"
                opacity="0.7"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 68 76"
                  to="360 68 76"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* 尾びれ（クリア発光フィン） */}
            <path
              d="M 106 74 C 122 54, 134 56, 130 73 C 135 88, 122 95, 106 82 Z"
              fill={`url(#sonaFin-${mood})`}
              stroke="#ffffff"
              strokeOpacity="0.75"
              strokeWidth="1.5"
            />

            {/* 背びれミニスタビライザー */}
            <path
              d="M 66 31 C 76 21, 90 25, 88 37 Z"
              fill={`url(#sonaFin-${mood})`}
              stroke="#ffffff"
              strokeOpacity="0.7"
              strokeWidth="1.2"
            />

            {/* 頭上の紅白「玉ウキ」アンテナ */}
            <g transform="rotate(-14 58 34)">
              <line
                x1="58"
                y1="36"
                x2="58"
                y2="17"
                stroke="#94a3b8"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* 玉ウキ上半分(赤/コーラル) + 下半分(白) */}
              <circle cx="58" cy="14" r="8.5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path
                d="M 49.5 14 A 8.5 8.5 0 0 1 66.5 14 Z"
                fill={mood === 'caution' ? '#f43f5e' : '#ef4444'}
              />
              {/* アンテナ発光リング */}
              <circle
                cx="58"
                cy="14"
                r="11"
                fill="none"
                stroke={glowColor}
                strokeWidth="1.4"
                opacity="0.75"
              />
              <circle cx="55.5" cy="11" r="2" fill="#ffffff" opacity="0.85" />
            </g>

            {/* 丸っこい白×クリア魚型ドローンボディ */}
            <ellipse
              cx="66"
              cy="76"
              rx="45"
              ry="40"
              fill={`url(#sonaBody-${mood})`}
              stroke="#ffffff"
              strokeWidth="2.5"
            />

            {/* ボディ内部のクリア発光ソナーリング装飾 */}
            <ellipse
              cx="66"
              cy="76"
              rx="39"
              ry="34"
              fill="none"
              stroke={glowColor}
              strokeOpacity="0.55"
              strokeWidth="2"
            />

            {/* ボディ上部のぷっくりハイライト */}
            <ellipse
              cx="53"
              cy="49"
              rx="18"
              ry="7"
              transform="rotate(-14 53 49)"
              fill="#ffffff"
              opacity="0.82"
            />

            {/* LED液晶フェイスバイザー */}
            <rect
              x="26"
              y="54"
              width="62"
              height="42"
              rx="20"
              fill={`url(#sonaVisor-${mood})`}
              stroke={glowColor}
              strokeWidth="2.4"
            />

            {/* 5表情別のLEDアイ＆マウス描画 */}
            {mood === 'normal' && (
              <g>
                {/* にっこり ^ ^ 目 */}
                <path
                  d="M 37 74 Q 43 65 49 74"
                  fill="none"
                  stroke={eyeStroke}
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />
                <path
                  d="M 65 74 Q 71 65 77 74"
                  fill="none"
                  stroke={eyeStroke}
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />
                {/* 笑顔の口 */}
                <path
                  d="M 52 82 Q 57 87 62 82"
                  fill="none"
                  stroke={eyeStroke}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <circle cx="34" cy="80" r="3" fill="#38bdf8" opacity="0.5" />
                <circle cx="80" cy="80" r="3" fill="#38bdf8" opacity="0.5" />
              </g>
            )}

            {mood === 'excited' && (
              <g>
                {/* キラキラ爆釣チャンス目 ★ ★ */}
                <polygon
                  points="43,64 45.2,69.5 51,70 46.5,73.8 48,79.5 43,76.3 38,79.5 39.5,73.8 35,70 40.8,69.5"
                  fill="#fde047"
                />
                <polygon
                  points="71,64 73.2,69.5 79,70 74.5,73.8 76,79.5 71,76.3 66,79.5 67.5,73.8 63,70 68.8,69.5"
                  fill="#fde047"
                />
                <path
                  d="M 50 81 Q 57 90 64 81 Z"
                  fill="#38f2ff"
                />
                <circle cx="33" cy="81" r="3.5" fill="#fb7185" opacity="0.75" />
                <circle cx="81" cy="81" r="3.5" fill="#fb7185" opacity="0.75" />
              </g>
            )}

            {mood === 'caution' && (
              <g>
                {/* 心配・警戒 > < 目 */}
                <path
                  d="M 37 68 L 47 73 L 37 78"
                  fill="none"
                  stroke="#fda4af"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 77 68 L 67 73 L 77 78"
                  fill="none"
                  stroke="#fda4af"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 波線口 */}
                <path
                  d="M 49 85 Q 53 81 57 85 T 65 85"
                  fill="none"
                  stroke="#fda4af"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                {/* 汗マーク */}
                <path
                  d="M 84 58 C 87 63, 87 67, 84 67 C 81 67, 81 63, 84 58 Z"
                  fill="#38bdf8"
                />
              </g>
            )}

            {mood === 'analyzing' && (
              <g>
                {/* レーダー波形スキャンアイ */}
                <circle
                  cx="43"
                  cy="73"
                  r="6"
                  fill="none"
                  stroke="#38f2ff"
                  strokeWidth="2.8"
                />
                <circle cx="43" cy="73" r="2" fill="#fde047" />
                <circle
                  cx="71"
                  cy="73"
                  r="6"
                  fill="none"
                  stroke="#38f2ff"
                  strokeWidth="2.8"
                />
                <circle cx="71" cy="73" r="2" fill="#fde047" />
                <polyline
                  points="45,85 51,85 54,80 58,89 61,83 64,85 70,85"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {mood === 'celebration' && (
              <g>
                {/* お祝いハート＆大喜びアイ */}
                <path
                  d="M 36 73 Q 43 63 50 73"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                />
                <path
                  d="M 64 73 Q 71 63 78 73"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                />
                <path
                  d="M 49 80 Q 57 91 65 80 Z"
                  fill="#fde047"
                />
                <circle cx="33" cy="80" r="3.6" fill="#fb7185" opacity="0.8" />
                <circle cx="81" cy="80" r="3.6" fill="#fb7185" opacity="0.8" />
              </g>
            )}

            {/* 側面の発光ヒレ（胸びれ） */}
            <path
              d="M 86 82 C 101 80, 105 94, 90 98 C 84 99, 82 90, 86 82 Z"
              fill={`url(#sonaFin-${mood})`}
              stroke="#ffffff"
              strokeWidth="1.5"
            />

            {/* 下部の小さな補助ヒレ */}
            <ellipse
              cx="50"
              cy="112"
              rx="8"
              ry="4.5"
              transform="rotate(18 50 112)"
              fill={`url(#sonaFin-${mood})`}
            />
          </svg>
        )}
      </div>
    </button>
  );
}
