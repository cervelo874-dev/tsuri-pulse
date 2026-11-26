'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Filter,
  Fish,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import { FISH_GENRE_LIST, FISH_SCORING_CONFIG } from '@/config/fishScoringConfig';
import Sonamaru from '@/components/character/Sonamaru';
import { useApp } from '@/context/AppContext';
import { compressCatchPhoto } from '@/lib/imageCompressor';
import { decodeWmoWeather, degToCompassJa } from '@/lib/windUtils';
import { FishGenreId } from '@/types';

const QUICK_SPECIES_SUGGESTIONS: Record<FishGenreId, string[]> = {
  sabiki: ['アジ', 'イワシ', 'サバ', 'サッパ'],
  bluefish: ['ツバス', 'ハマチ', 'サゴシ', 'メジロ', 'シオ'],
  chinu: ['チヌ（クロダイ）', 'キビレ', 'メジナ（グレ）'],
  rockfish: ['ガシラ（カサゴ）', 'メバル', 'アコウ（キジハタ）', 'タケノコメバル'],
  tachiuo: ['タチウオ'],
  aoriika: ['アオリイカ', 'コウイカ', 'ケンサキイカ'],
};

function formatNowLocalInput(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

export default function CatchLogView() {
  const {
    activeSpot,
    selectedGenre,
    selectedHour,
    dailyWeather,
    dailyTide,
    currentHourScore,
    catchLogs,
    celebrationTrigger,
    addCatchLog,
    removeCatchLog,
  } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [filterGenre, setFilterGenre] = useState<FishGenreId | 'all'>('all');
  const [filterSpot, setFilterSpot] = useState<string>('all');
  const [showCelebrationBanner, setShowCelebrationBanner] = useState(false);

  // 記録フォームの入力ステート
  const [formGenre, setFormGenre] = useState<FishGenreId>(selectedGenre);
  const [fishName, setFishName] = useState<string>('アジ');
  const [sizeCm, setSizeCm] = useState<number>(22);
  const [count, setCount] = useState<number>(1);
  const [memo, setMemo] = useState<string>('');
  const [dateTimeStr, setDateTimeStr] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  void celebrationTrigger;

  // フォームを開いた瞬間に「現在の場所・日時・天気・風・潮回り」を自動セット
  const openNewLogModal = () => {
    setFormGenre(selectedGenre);
    setFishName(QUICK_SPECIES_SUGGESTIONS[selectedGenre][0]);
    setSizeCm(selectedGenre === 'bluefish' ? 45 : selectedGenre === 'tachiuo' ? 75 : 22);
    setCount(1);
    setMemo('');
    setPhotoPreview(undefined);
    setDateTimeStr(formatNowLocalInput());
    setFormOpen(true);
  };

  const wxNow = dailyWeather.hourly[selectedHour] ?? dailyWeather.hourly[0];
  const tideNow = dailyTide.hourly[selectedHour] ?? dailyTide.hourly[0];
  const wmoNow = decodeWmoWeather(wxNow.weatherCode);
  const windDirLabel = degToCompassJa(wxNow.windDirectionDeg);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressCatchPhoto(file, 800, 0.74);
      setPhotoPreview(compressed);
    } catch {
      // ignore invalid image
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCatchLog({
      spotId: activeSpot.id,
      spotName: activeSpot.name,
      dateTimeStr: dateTimeStr || formatNowLocalInput(),
      genreId: formGenre,
      fishName: fishName.trim() || FISH_SCORING_CONFIG[formGenre].shortName,
      sizeCm: Math.max(1, Number(sizeCm) || 20),
      count: Math.max(1, Number(count) || 1),
      memo: memo.trim(),
      weatherLabel: wmoNow.label,
      weatherCode: wxNow.weatherCode,
      tempC: wxNow.tempC,
      windSpeedMs: wxNow.windSpeedMs,
      windDirLabel,
      tideName: dailyTide.tideName,
      tideState: tideNow.state,
      tideLevelCm: tideNow.levelCm,
      scoreAtCatch: currentHourScore.total,
      hasPhoto: !!photoPreview,
      photoDataUrl: photoPreview,
    });
    setFormOpen(false);
    setShowCelebrationBanner(true);
    setTimeout(() => setShowCelebrationBanner(false), 6000);
  };

  const distinctSpots = useMemo(() => {
    const names = new Set<string>();
    catchLogs.forEach((l) => names.add(l.spotName));
    return Array.from(names);
  }, [catchLogs]);

  const filteredLogs = useMemo(() => {
    return catchLogs.filter((l) => {
      if (filterGenre !== 'all' && l.genreId !== filterGenre) return false;
      if (filterSpot !== 'all' && l.spotName !== filterSpot) return false;
      return true;
    });
  }, [catchLogs, filterGenre, filterSpot]);

  return (
    <div className="space-y-4 pb-20 relative min-h-[70dvh]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-black tracking-tight">釣果ログ</h2>
          <p className="text-xs opacity-75">
            累計記録：{catchLogs.length}件（場所・天気・潮回りを自動記録）
          </p>
        </div>
      </div>

      {/* 保存直後のソナまるお祝いバナー（celebration表情） */}
      {showCelebrationBanner && (
        <div className="glass-panel-strong rounded-3xl p-4 border-2 border-emerald-400/70 flex items-center gap-3 animate-pulse">
          <Sonamaru mood="celebration" size="sm" />
          <div className="space-y-0.5">
            <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              ナイスフィッシュ！！記録完了！
            </div>
            <p className="text-xs font-bold leading-snug">
              ピピッ🎉 おめでとう〜っ！潮回りや風の条件もバッチリ保存したよっ！次回の釣行の最強データになるね！
            </p>
          </div>
        </div>
      )}

      {/* 魚種・釣り場フィルター */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-xs font-bold opacity-75 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          絞込:
        </span>
        <select
          aria-label="魚種で絞り込み"
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value as FishGenreId | 'all')}
          className="glass-pill rounded-full px-3 py-1.5 text-xs font-bold outline-none"
        >
          <option value="all">すべての魚種</option>
          {FISH_GENRE_LIST.map((g) => (
            <option key={g.id} value={g.id}>
              {g.shortName}
            </option>
          ))}
        </select>

        <select
          aria-label="釣り場で絞り込み"
          value={filterSpot}
          onChange={(e) => setFilterSpot(e.target.value)}
          className="glass-pill rounded-full px-3 py-1.5 text-xs font-bold outline-none max-w-[170px]"
        >
          <option value="all">すべての釣り場</option>
          {distinctSpots.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </select>
      </div>

      {/* 釣果カード一覧（モックアップ忠実デザイン） */}
      {filteredLogs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-7 text-center space-y-3">
          <div className="flex justify-center">
            <Sonamaru mood="normal" size="md" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold">まだ釣果ログがありません</h3>
            <p className="text-xs opacity-75 leading-relaxed">
              右下の「＋」ボタンから魚種とサイズを入れるだけで、その時の天気・風速・潮回りが自動保存されるよっ！
            </p>
          </div>
          <button
            type="button"
            onClick={openNewLogModal}
            className="glow-button-cyan px-5 py-2.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            最初の1匹を記録してみる
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((entry) => {
            const genreCfg = FISH_SCORING_CONFIG[entry.genreId];
            return (
              <article
                key={entry.id}
                className="glass-panel rounded-3xl p-3.5 flex gap-3.5 items-start"
              >
                {/* 左側サムネイル（写真または魚種シルエットカード） */}
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-cyan-400/25 flex flex-col items-center justify-center bg-slate-900/40 relative">
                  {entry.photoDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={entry.photoDataUrl}
                      alt={entry.fishName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                      <Fish
                        className="w-8 h-8"
                        style={{ color: genreCfg?.accentColor || 'var(--accent-cyan)' }}
                      />
                      <span className="text-[10px] font-bold opacity-70">
                        {entry.dateTimeStr.split(' ')[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* 右側詳細＆環境バッジ */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black leading-tight">
                        {entry.fishName}
                      </h3>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span
                          className="text-lg font-black"
                          style={{ color: 'var(--accent-cyan)' }}
                        >
                          {entry.sizeCm}cm
                        </span>
                        <span className="text-xs font-bold opacity-80">
                          × {entry.count}匹
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCatchLog(entry.id)}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-rose-400"
                      aria-label="記録を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 環境自動記録カラフルピルバッジ */}
                  <div className="flex flex-wrap gap-1 text-[10px] font-extrabold">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40">
                      🌊 {entry.tideName}・{entry.tideState}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40">
                      📍 {entry.spotName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center gap-0.5">
                      <Wind className="w-2.5 h-2.5" />
                      {entry.windDirLabel} {entry.windSpeedMs}m/s
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40">
                      {entry.weatherLabel} {entry.tempC}℃・{entry.scoreAtCatch}点
                    </span>
                  </div>

                  {entry.memo && (
                    <p className="text-xs opacity-85 leading-snug pt-0.5">
                      「{entry.memo}」
                    </p>
                  )}

                  <div className="text-[10px] opacity-65">{entry.dateTimeStr}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 右下フローティング「＋」記録ボタン */}
      <button
        id="open-catch-modal-fab"
        type="button"
        onClick={openNewLogModal}
        className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full glow-button-cyan flex items-center justify-center shadow-2xl transition-transform active:scale-90"
        aria-label="釣果を記録する"
      >
        <Plus className="w-7 h-7 stroke-[2.6]" />
      </button>

      {/* かんたん釣果記録モーダル（環境データ自動入力つき） */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ background: 'var(--modal-backdrop)' }}
        >
          <form
            onSubmit={handleSaveLog}
            className="glass-panel-strong w-full max-w-md rounded-3xl p-5 max-h-[90dvh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center gap-1.5">
                <Fish className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
                かんたん釣果記録
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="glass-pill w-8 h-8 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 自動入力された環境スナップショット表示 */}
            <div className="glass-panel rounded-2xl p-3 space-y-1.5 text-xs">
              <div className="font-extrabold flex items-center justify-between">
                <span className="flex items-center gap-1" style={{ color: 'var(--accent-cyan)' }}>
                  <MapPin className="w-3.5 h-3.5" />
                  {activeSpot.name}（環境データ自動セット済）
                </span>
                <span>スコア {currentHourScore.total}点</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] opacity-85">
                <span>🗓 {dateTimeStr}</span>
                <span>・{wmoNow.label} {wxNow.tempC}℃</span>
                <span>・{windDirLabel} {wxNow.windSpeedMs}m/s</span>
                <span>・{dailyTide.tideName}（{tideNow.state} {tideNow.levelCm}cm）</span>
              </div>
            </div>

            {/* ジャンル選択 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold block">ジャンル ＆ 魚種名</label>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {FISH_GENRE_LIST.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setFormGenre(g.id);
                      setFishName(QUICK_SPECIES_SUGGESTIONS[g.id][0]);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                      formGenre === g.id ? 'glow-button-cyan' : 'glass-pill opacity-80'
                    }`}
                  >
                    {g.shortName}
                  </button>
                ))}
              </div>

              {/* 魚名ワンタップ候補チップ */}
              <div className="flex flex-wrap gap-1.5 py-0.5">
                {QUICK_SPECIES_SUGGESTIONS[formGenre].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setFishName(sp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      fishName === sp
                        ? 'bg-cyan-500/30 border border-cyan-300'
                        : 'glass-pill opacity-75'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={fishName}
                onChange={(e) => setFishName(e.target.value)}
                placeholder="魚の名前を入力"
                className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--glass-border)',
                }}
              />
            </div>

            {/* サイズ(cm) ＆ 匹数 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold block">サイズ (cm)</label>
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={sizeCm}
                  onChange={(e) => setSizeCm(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-base font-black border outline-none"
                  style={{
                    background: 'var(--input-bg)',
                    borderColor: 'var(--glass-border)',
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">匹数</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-base font-black border outline-none"
                  style={{
                    background: 'var(--input-bg)',
                    borderColor: 'var(--glass-border)',
                  }}
                />
              </div>
            </div>

            {/* 写真（任意・自動リサイズ圧縮） */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold block">
                写真（任意：自動で軽量リサイズ保存されます）
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="glass-pill px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
                  <span>{isCompressing ? '圧縮中...' : '写真を選択・撮影'}</span>
                </button>
                {photoPreview && (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-cyan-400/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="プレビュー"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(undefined)}
                      className="absolute top-0.5 right-0.5 bg-slate-950/80 rounded-full p-0.5 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* ひとことメモ */}
            <div className="space-y-1">
              <label className="text-xs font-bold block">ひとことメモ（任意）</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例：ピンクスキン5号・底から1mで連発！"
                className="w-full rounded-xl px-3 py-2.5 text-xs border outline-none"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--glass-border)',
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full glow-button-cyan py-3.5 rounded-2xl text-sm font-extrabold"
            >
              🎉 この釣果を記録する！
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
