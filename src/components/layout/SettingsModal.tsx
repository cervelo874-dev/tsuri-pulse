'use client';

import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  KeyRound,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { degToCompassJa } from '@/lib/windUtils';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    settings,
    updateGeminiApiKey,
    mySpots,
    removeMySpot,
    exportBackupJson,
    importBackupJson,
  } = useApp();

  const [apiKeyInput, setApiKeyInput] = useState(settings.geminiApiKey);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleSaveKey = () => {
    updateGeminiApiKey(apiKeyInput);
    setSavedNotice('APIキー設定をブラウザに保存しました！');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleExport = async () => {
    try {
      const json = await exportBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tsuripulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSavedNotice('バックアップJSONをダウンロードしました！');
      setTimeout(() => setSavedNotice(null), 2500);
    } catch {
      setErrorMsg('エクスポートに失敗しました。');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const text = await file.text();
      await importBackupJson(text);
      setSavedNotice('データを復元しました！');
      setTimeout(() => setSavedNotice(null), 3000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'JSONファイルの読み込みに失敗しました。'
      );
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'var(--modal-backdrop)' }}
    >
      <div className="glass-panel-strong w-full max-w-md rounded-3xl p-5 max-h-[88dvh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
            設定 ＆ データ管理
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="glass-pill w-9 h-9 rounded-full flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedNotice && (
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-400/50 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* Gemini API キー設定 */}
        <section className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-1.5">
            <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
            Gemini APIキー（任意・無料枠対応）
          </label>
          <p className="text-xs opacity-75 leading-relaxed">
            未設定のままでも高精度なルールベース「AI作戦会議」が完全無料で動作します。Google AI StudioのAPIキーを設定すると、Gemini生成による個別作戦会議（3時間キャッシュ）が有効になります。
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy...（未設定でもOK）"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm border outline-none"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--glass-border)',
              }}
            />
            <button
              type="button"
              onClick={handleSaveKey}
              className="glow-button-cyan px-4 py-2.5 rounded-xl text-xs font-extrabold shrink-0"
            >
              保存
            </button>
          </div>
        </section>

        {/* JSONエクスポート / インポート */}
        <section className="space-y-2.5 pt-2 border-t border-cyan-400/20">
          <h3 className="text-sm font-bold">データバックアップ（機種変更・保存用）</h3>
          <p className="text-xs opacity-75">
            マイスポット・持ち物チェック・釣果ログ（圧縮写真含む）を1つのJSONファイルに書き出し／復元できます。
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="glass-pill py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-500/15 transition"
            >
              <Download className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              JSON書き出し
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-pill py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-500/15 transition"
            >
              <Upload className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              JSON読み込み
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </section>

        {/* マイスポット整理 */}
        <section className="space-y-2 pt-2 border-t border-cyan-400/20">
          <h3 className="text-sm font-bold">登録済みマイスポット（{mySpots.length}件）</h3>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {mySpots.map((spot) => (
              <div
                key={spot.id}
                className="glass-pill px-3 py-2 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">{spot.name}</div>
                  <div className="opacity-70 text-[11px]">
                    海向き：{degToCompassJa(spot.seaDirectionDeg)}（{spot.seaDirectionDeg}°）
                  </div>
                </div>
                {mySpots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMySpot(spot.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
                    aria-label={`${spot.name}を削除`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
