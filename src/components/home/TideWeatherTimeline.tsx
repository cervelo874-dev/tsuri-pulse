'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Navigation,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { decodeWmoWeather } from '@/lib/windUtils';

function WeatherSmallIcon({ code, isNight }: { code: number; isNight: boolean }) {
  const wmo = decodeWmoWeather(code);
  if (wmo.kind === 'storm') return <CloudLightning className="w-4 h-4 text-rose-400" />;
  if (wmo.kind === 'snow') return <Snowflake className="w-4 h-4 text-sky-300" />;
  if (wmo.isRainy) return <CloudRain className="w-4 h-4 text-sky-400" />;
  if (wmo.kind === 'cloudy') return <Cloud className="w-4 h-4 opacity-80" />;
  if (wmo.kind === 'partly-cloudy') return <CloudSun className="w-4 h-4 text-amber-300" />;
  return (
    <Sun
      className={`w-4 h-4 ${isNight ? 'text-cyan-300 opacity-75' : 'text-amber-400'}`}
    />
  );
}

/**
 * 発光曲線タイドグラフ ＆ 1時間気象タイムライン（指・マウス横なぞりリアルタイム連動）
 * ＋ 海面水温の参考表示バッジ（スコア計算には不使用）
 */
export default function TideWeatherTimeline() {
  const {
    dailyTide,
    dailyWeather,
    selectedHour,
    setSelectedHour,
    currentGenreEval,
  } = useApp();

  const svgRef = useRef<SVGSVGElement | null>(null);

  const W = 640;
  const H = 176;
  const PAD_L = 34;
  const PAD_R = 16;
  const PAD_T = 28;
  const PAD_B = 26;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const { minY, maxY, linePath, areaPath } = useMemo(() => {
    const vals = dailyTide.curve.map((p) => p.levelCm);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const margin = Math.max(12, Math.round((rawMax - rawMin) * 0.18));
    const minLevel = Math.floor((rawMin - margin) / 10) * 10;
    const maxLevel = Math.ceil((rawMax + margin) / 10) * 10;
    const span = Math.max(20, maxLevel - minLevel);

    const pts = dailyTide.curve.map((p) => {
      const x = PAD_L + (p.hourFloat / 24) * plotW;
      const y = PAD_T + (1 - (p.levelCm - minLevel) / span) * plotH;
      return { x, y };
    });

    const dLine = pts
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');

    const dArea = `${dLine} L ${(PAD_L + plotW).toFixed(1)} ${(PAD_T + plotH).toFixed(
      1
    )} L ${PAD_L.toFixed(1)} ${(PAD_T + plotH).toFixed(1)} Z`;

    return {
      minY: minLevel,
      maxY: maxLevel,
      linePath: dLine,
      areaPath: dArea,
    };
  }, [dailyTide.curve, plotH, plotW]);

  const toX = useCallback(
    (hourFloat: number) => PAD_L + (hourFloat / 24) * plotW,
    [plotW]
  );
  const toY = useCallback(
    (levelCm: number) => PAD_T + (1 - (levelCm - minY) / Math.max(20, maxY - minY)) * plotH,
    [maxY, minY, plotH]
  );

  // 指・マウスでの横なぞり時刻更新
  const scrubFromClientX = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const relX = ((clientX - rect.left) / rect.width) * W;
      const ratio = (relX - PAD_L) / plotW;
      const hour = Math.max(0, Math.min(23, Math.round(ratio * 24)));
      setSelectedHour(hour, true);
    },
    [plotW, setSelectedHour]
  );

  const selectedTide = dailyTide.hourly[selectedHour] ?? dailyTide.hourly[0];
  const selectedScore =
    currentGenreEval.hourlyScores[selectedHour]?.total ?? 0;
  const cursorX = toX(selectedHour);
  const cursorY = toY(selectedTide.levelCm);

  // 参考海面水温（選択時刻または日平均）
  const sstRef =
    dailyWeather.hourly[selectedHour]?.seaSurfaceTempC ??
    dailyWeather.meanSeaSurfaceTempC;

  // 2時間刻みの見やすい気象タイムライン列（タップでも全24時間の該当時刻へ連動）
  const timelineHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  return (
    <section
      aria-label="タイドグラフと気象タイムライン"
      className="glass-panel rounded-3xl p-4 space-y-3"
    >
      {/* ヘッダー行：タイトル・基準港・潮名・参考水温バッジ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold">タイドグラフ ＆ 気象連動</h2>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-extrabold glass-pill"
              style={{ color: 'var(--accent-cyan)' }}
            >
              {dailyTide.tideName}（月齢{dailyTide.moonAge}）
            </span>
          </div>
          <p className="text-[11px] opacity-70 mt-0.5">
            基準港：{dailyTide.port.name} ／ グラフを横に指でなぞると時刻連動します
          </p>
        </div>

        {/* 海面水温（参考表示のみ・スコア計算には一切不使用） */}
        {sstRef !== null && (
          <div
            className="glass-pill px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 opacity-85"
            title="沖合メッシュの参考海面水温です。釣れやすさスコア計算には使用していません。"
          >
            <Thermometer className="w-3 h-3" style={{ color: 'var(--accent-cyan)' }} />
            <span>沖合の水温目安：約{sstRef.toFixed(1)}℃（参考）</span>
          </div>
        )}
      </div>

      {/* 満潮・干潮・日の出・日の入りサマリーチップ */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {dailyTide.extremes.map((ext, i) => (
          <span
            key={i}
            className="glass-pill px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"
          >
            <span
              className={
                ext.type === 'high' ? 'text-cyan-400 font-black' : 'text-amber-400 font-black'
              }
            >
              {ext.type === 'high' ? '満潮' : '干潮'}
            </span>
            <span>{ext.timeStr}</span>
            <span className="opacity-70">({ext.levelCm}cm)</span>
          </span>
        ))}
        <span className="glass-pill px-2 py-0.5 rounded-full flex items-center gap-1 opacity-80">
          <Sunrise className="w-3 h-3 text-amber-400" />
          {dailyWeather.sunriseStr}
        </span>
        <span className="glass-pill px-2 py-0.5 rounded-full flex items-center gap-1 opacity-80">
          <Sunset className="w-3 h-3 text-orange-400" />
          {dailyWeather.sunsetStr}
        </span>
      </div>

      {/* 横なぞり対応カスタム発光SVGタイドグラフ */}
      <div className="relative select-none touch-none">
        <svg
          id="tide-interactive-svg"
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-40 cursor-ew-resize overflow-visible"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) {
              scrubFromClientX(e.clientX);
            }
          }}
        >
          <defs>
            <linearGradient id="tideAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--tide-fill-top)" />
              <stop offset="100%" stopColor="var(--tide-fill-bottom)" />
            </linearGradient>
            <filter id="tideNeonGlow" x="-10%" y="-20%" width="120%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 夜間帯の淡いシェーディング（日の出前・日の入り後） */}
          <rect
            x={PAD_L}
            y={PAD_T}
            width={Math.max(0, toX(dailyWeather.sunriseHour) - PAD_L)}
            height={plotH}
            fill="rgba(2, 12, 27, 0.18)"
            rx="4"
          />
          <rect
            x={toX(dailyWeather.sunsetHour)}
            y={PAD_T}
            width={Math.max(0, PAD_L + plotW - toX(dailyWeather.sunsetHour))}
            height={plotH}
            fill="rgba(2, 12, 27, 0.18)"
            rx="4"
          />

          {/* 水平目盛り線 */}
          {[0, 0.5, 1].map((ratio) => {
            const val = Math.round(minY + (maxY - minY) * ratio);
            const y = toY(val);
            return (
              <g key={ratio}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={PAD_L + plotW}
                  y2={y}
                  stroke="var(--radar-grid)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <text
                  x={PAD_L - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--text-dim)"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* 時刻目盛り (0, 6, 12, 18, 24) */}
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hr) => {
            const x = toX(hr);
            return (
              <g key={hr}>
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={PAD_T + plotH}
                  stroke="var(--radar-grid)"
                  strokeWidth="0.8"
                />
                <text
                  x={x}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--text-dim)"
                >
                  {hr}時
                </text>
              </g>
            );
          })}

          {/* 潮位エリア塗り ＆ 発光ベジェ曲線 */}
          <path d={areaPath} fill="url(#tideAreaFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--tide-stroke)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#tideNeonGlow)"
          />

          {/* 満干潮ピークドット */}
          {dailyTide.extremes.map((ext, idx) => {
            const ex = toX(ext.hourFloat);
            const ey = toY(ext.levelCm);
            return (
              <g key={idx}>
                <circle
                  cx={ex}
                  cy={ey}
                  r="5"
                  fill={ext.type === 'high' ? '#22d3ee' : '#fbbf24'}
                  stroke="#ffffff"
                  strokeWidth="1.8"
                />
                <text
                  x={ex}
                  y={ext.type === 'high' ? ey - 9 : ey + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="var(--text-primary)"
                >
                  {ext.timeStr}
                </text>
              </g>
            );
          })}

          {/* 選択時刻のレーザー縦ライン ＆ 現在ドット */}
          <line
            x1={cursorX}
            y1={PAD_T - 6}
            x2={cursorX}
            y2={PAD_T + plotH}
            stroke="var(--accent-gold)"
            strokeWidth="2.2"
            strokeDasharray="4 2"
          />
          <circle
            cx={cursorX}
            cy={cursorY}
            r="7"
            fill="var(--accent-gold)"
            stroke="#ffffff"
            strokeWidth="2.4"
          />

          {/* カーソル上部の情報ピル */}
          <g
            transform={`translate(${Math.max(
              92,
              Math.min(W - 92, cursorX)
            )}, 16)`}
          >
            <rect
              x="-86"
              y="-13"
              width="172"
              height="22"
              rx="11"
              fill="var(--glass-bg-strong)"
              stroke="var(--accent-gold)"
              strokeWidth="1.2"
            />
            <text
              x="0"
              y="2"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill="var(--text-primary)"
            >
              {`${String(selectedHour).padStart(2, '0')}:00 ｜ ${selectedTide.levelCm}cm(${selectedTide.state}) ｜ ${selectedScore}点`}
            </text>
          </g>
        </svg>
      </div>

      {/* 縦に揃えた気象タイムライン（2時間刻み12列＋ワンタップ時刻切替） */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-1">
        {timelineHours.map((h) => {
          const wx = dailyWeather.hourly[h] ?? dailyWeather.hourly[0];
          const sc = currentGenreEval.hourlyScores[h]?.total ?? 0;
          const isNight =
            h < Math.floor(dailyWeather.sunriseHour) ||
            h > Math.ceil(dailyWeather.sunsetHour);
          const isSelected = Math.abs(selectedHour - h) <= 0 || selectedHour === h + 1;
          const windBlowTo = (wx.windDirectionDeg + 180) % 360;

          return (
            <button
              key={h}
              type="button"
              onClick={() => setSelectedHour(h, true)}
              className={`rounded-2xl py-2 px-1 flex flex-col items-center gap-1 transition-all ${
                isSelected
                  ? 'glow-button-cyan scale-[1.03]'
                  : 'glass-pill opacity-85 hover:opacity-100'
              }`}
            >
              <span className="text-[10px] font-extrabold">{h}時</span>
              <WeatherSmallIcon code={wx.weatherCode} isNight={isNight} />
              <span className="text-[10px] font-bold">{Math.round(wx.tempC)}°</span>
              <span className="text-[9px] text-sky-400 font-bold">
                {wx.precipProb}%
              </span>
              <div className="flex items-center gap-0.5 text-[9px] font-bold">
                <Navigation
                  className="w-2.5 h-2.5"
                  style={{ transform: `rotate(${windBlowTo}deg)` }}
                />
                <span>{Math.round(wx.windSpeedMs)}m</span>
              </div>
              <span
                className="text-[9px] font-black px-1.5 rounded-full"
                style={{
                  color:
                    sc >= 80
                      ? 'var(--accent-gold)'
                      : sc >= 65
                      ? 'var(--accent-cyan)'
                      : 'var(--text-dim)',
                }}
              >
                {sc}点
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
