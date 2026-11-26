'use client';

import React, { useState } from 'react';
import GearView from '@/components/gear/GearView';
import HomeView from '@/components/home/HomeView';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import SettingsModal from '@/components/layout/SettingsModal';
import CatchLogView from '@/components/log/CatchLogView';
import MapView from '@/components/map/MapView';
import { useApp } from '@/context/AppContext';

export default function TsuriPulsePage() {
  const { activeTab } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto relative">
      {/* 共通グラスヘッダー（マイスポット切替・日付切替・☀️/🌙テーマ切替・設定） */}
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      {/* 4タブメインビュー */}
      <main className="flex-1 px-4 pb-20">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'gear' && <GearView />}
        {activeTab === 'log' && <CatchLogView />}
      </main>

      {/* 下部4タブ固定ナビゲーション */}
      <BottomNav />

      {/* 設定・APIキー・JSONバックアップモーダル */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
