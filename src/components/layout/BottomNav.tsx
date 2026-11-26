'use client';

import React from 'react';
import { Backpack, BookOpen, Home, Map as MapIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { NavTab } from '@/types';

const NAV_ITEMS: { id: NavTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'ホーム', Icon: Home },
  { id: 'map', label: 'マップ', Icon: MapIcon },
  { id: 'gear', label: '持ち物', Icon: Backpack },
  { id: 'log', label: 'ログ', Icon: BookOpen },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, catchLogs } = useApp();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl"
      style={{
        background: 'var(--nav-bg)',
        borderColor: 'var(--glass-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 h-16 px-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`nav-tab-${id}`}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive ? 'font-extrabold' : 'opacity-65 hover:opacity-95 font-medium'
              }`}
              style={{
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)',
              }}
            >
              {/* アクティブタブの発光トップライン */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b-full"
                  style={{
                    background: 'var(--accent-cyan)',
                    boxShadow: '0 2px 12px var(--accent-cyan)',
                  }}
                />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {id === 'log' && catchLogs.length > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-cyan-500 text-slate-950">
                    {catchLogs.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
