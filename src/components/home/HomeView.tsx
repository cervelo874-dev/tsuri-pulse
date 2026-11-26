'use client';

import React, { useCallback, useState } from 'react';
import StrategyModal from '@/components/character/StrategyModal';
import FishTabs from '@/components/home/FishTabs';
import SonarRadarCard from '@/components/home/SonarRadarCard';
import TideWeatherTimeline from '@/components/home/TideWeatherTimeline';
import WindWaveCompass from '@/components/home/WindWaveCompass';
import { useApp } from '@/context/AppContext';
import { getOrGenerateStrategyPlan } from '@/lib/aiAdvisor';
import { StrategyPlan } from '@/types';

export default function HomeView() {
  const {
    activeSpot,
    selectedGenre,
    currentGenreEval,
    dailyWeather,
    dailyTide,
    selectedHour,
    settings,
    currentHourScore,
  } = useApp();

  const [strategyOpen, setStrategyOpen] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyPlan, setStrategyPlan] = useState<StrategyPlan | null>(null);

  const runStrategy = useCallback(
    async (forceRefresh = false) => {
      setStrategyOpen(true);
      setStrategyLoading(true);
      const plan = await getOrGenerateStrategyPlan({
        spot: activeSpot,
        genreId: selectedGenre,
        evalData: currentGenreEval,
        dailyWeather,
        dailyTide,
        selectedHour,
        apiKey: settings.geminiApiKey,
        forceRefresh,
      });
      setStrategyPlan(plan);
      setStrategyLoading(false);
    },
    [
      activeSpot,
      currentGenreEval,
      dailyTide,
      dailyWeather,
      selectedGenre,
      selectedHour,
      settings.geminiApiKey,
    ]
  );

  return (
    <div className="space-y-3.5 pb-6">
      {/* 2. 魚種タブ（発光枠 ＋ 狙い目TOP3バッジ） */}
      <FishTabs />

      {/* 3. 結論エリア（ソナーレーダー × ソナまる × 初心者通訳パネル） */}
      <SonarRadarCard onOpenStrategy={() => runStrategy(false)} />

      {/* 4. タイドグラフ ＆ 気象タイムライン（横なぞりリアルタイム連動） */}
      <TideWeatherTimeline />

      {/* 5. 風向き・波高ビジュアルコンパス */}
      <WindWaveCompass />

      {/* AI作戦会議モーダル */}
      <StrategyModal
        open={strategyOpen}
        loading={strategyLoading}
        plan={strategyPlan}
        mood={currentHourScore.sonamaruMood}
        onRefresh={() => runStrategy(true)}
        onClose={() => setStrategyOpen(false)}
      />
    </div>
  );
}
