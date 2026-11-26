'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DEFAULT_GENRE_GEAR } from '@/config/gearPresets';
import { INITIAL_PRESET_SPOTS } from '@/config/presetSpots';
import { evaluateAllGenresForDay } from '@/lib/scoringEngine';
import {
  DEFAULT_SETTINGS,
  deletePhotoFromIdb,
  exportBackupPayload,
  importBackupPayload,
  loadAllPhotosFromIdb,
  loadCatchLogsMeta,
  loadGearState,
  loadMySpots,
  loadSettings,
  loadWeatherGearChecked,
  saveCatchLogsMeta,
  saveGearState,
  saveMySpots,
  savePhotoToIdb,
  saveSettings,
  saveWeatherGearChecked,
} from '@/lib/storage';
import { computeDailyTide } from '@/lib/tideEngine';
import {
  buildEstimatedForecast,
  fetchSpotForecast,
  getCurrentJstHour,
  getJstDateString,
} from '@/lib/weatherApi';
import {
  AppSettings,
  CatchLogEntry,
  DailyFishEvaluation,
  DailyTideData,
  DailyWeatherForecast,
  FishGenreId,
  FishingSpot,
  GearChecklistItem,
  HourlyFishScore,
  NavTab,
  SpotForecastBundle,
  ThemeMode,
} from '@/types';

interface AppContextValue {
  hydrated: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  settings: AppSettings;
  updateGeminiApiKey: (key: string) => void;

  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;

  mySpots: FishingSpot[];
  activeSpot: FishingSpot;
  selectSpot: (spot: FishingSpot) => void;
  saveSpotToMySpots: (spot: FishingSpot) => void;
  updateSpotSeaDirection: (spotId: string, seaDirectionDeg: number) => void;
  removeMySpot: (spotId: string) => void;

  dayIndex: number; // 0: 今日, 1: 明日, 2: 2日後, 3: 3日後
  setDayIndex: (idx: number) => void;

  selectedGenre: FishGenreId;
  setSelectedGenre: (genre: FishGenreId) => void;

  selectedHour: number;
  setSelectedHour: (hour: number, isManual?: boolean) => void;
  jumpToCurrentHour: () => void;
  resetToAutoHour: () => void;
  isManualHour: boolean;

  isLoadingForecast: boolean;
  forecastSource: 'live' | 'cache' | 'estimated';
  refreshForecast: () => Promise<void>;

  dailyWeather: DailyWeatherForecast;
  dailyTide: DailyTideData;
  genreEvaluations: Record<FishGenreId, DailyFishEvaluation>;
  currentGenreEval: DailyFishEvaluation;
  currentHourScore: HourlyFishScore;

  // 持ち物状態
  gearState: Record<FishGenreId, GearChecklistItem[]>;
  weatherGearChecked: Record<string, boolean>;
  toggleGenreGearItem: (genreId: FishGenreId, itemId: string) => void;
  addCustomGearItem: (genreId: FishGenreId, title: string) => void;
  removeCustomGearItem: (genreId: FishGenreId, itemId: string) => void;
  resetGenreGearChecks: (genreId: FishGenreId) => void;
  toggleWeatherGearItem: (itemId: string) => void;

  // 釣果ログ状態
  catchLogs: CatchLogEntry[];
  celebrationTrigger: number;
  addCatchLog: (entry: Omit<CatchLogEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeCatchLog: (id: string) => Promise<void>;

  // バックアップ
  exportBackupJson: () => Promise<string>;
  importBackupJson: (jsonText: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  const [mySpots, setMySpots] = useState<FishingSpot[]>(INITIAL_PRESET_SPOTS);
  const [activeSpot, setActiveSpot] = useState<FishingSpot>(INITIAL_PRESET_SPOTS[0]);

  const [dayIndex, setDayIndexState] = useState<number>(0);
  const [selectedGenre, setSelectedGenreState] = useState<FishGenreId>('sabiki');
  const [selectedHourState, setSelectedHourState] = useState<number>(6);
  const [isManualHour, setIsManualHour] = useState<boolean>(false);

  const [forecastBundle, setForecastBundle] = useState<SpotForecastBundle>(() =>
    buildEstimatedForecast(INITIAL_PRESET_SPOTS[0].lat, INITIAL_PRESET_SPOTS[0].lon)
  );
  const targetForecastKey = `${activeSpot.lat.toFixed(4)}_${activeSpot.lon.toFixed(4)}`;
  const [loadedForecastKey, setLoadedForecastKey] = useState<string>('');
  const [manualRefreshing, setManualRefreshing] = useState<boolean>(false);
  const isLoadingForecast = manualRefreshing || loadedForecastKey !== targetForecastKey;

  const [gearState, setGearState] = useState<Record<FishGenreId, GearChecklistItem[]>>(
    DEFAULT_GENRE_GEAR
  );
  const [weatherGearChecked, setWeatherGearChecked] = useState<Record<string, boolean>>({});
  const [catchLogs, setCatchLogs] = useState<CatchLogEntry[]>([]);
  const [celebrationTrigger, setCelebrationTrigger] = useState<number>(0);

  // 初期マウント時にLocalStorage & IndexedDBを非同期読み込み
  useEffect(() => {
    let active = true;
    loadAllPhotosFromIdb().then((photoMap) => {
      if (!active) return;
      const loadedSettings = loadSettings();
      const loadedSpots = loadMySpots();
      const loadedGear = loadGearState();
      const loadedWxGear = loadWeatherGearChecked();
      const loadedLogs = loadCatchLogsMeta();

      setSettings(loadedSettings);
      setMySpots(loadedSpots);
      if (loadedSpots.length > 0) {
        setActiveSpot(loadedSpots[0]);
      }
      setGearState(loadedGear);
      setWeatherGearChecked(loadedWxGear);
      setCatchLogs(
        loadedLogs.map((entry) => ({
          ...entry,
          photoDataUrl: photoMap[entry.id] || entry.photoDataUrl,
        }))
      );
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // テーマ属性を<html>とmeta theme-colorへ反映
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', settings.theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        settings.theme === 'sunlight' ? '#bfe4ff' : '#041529'
      );
    }
  }, [settings.theme]);

  // スポット変更時にOpen-Meteo予報データを取得
  useEffect(() => {
    let cancelled = false;
    const key = `${activeSpot.lat.toFixed(4)}_${activeSpot.lon.toFixed(4)}`;

    fetchSpotForecast(activeSpot.lat, activeSpot.lon).then((bundle) => {
      if (!cancelled) {
        setForecastBundle(bundle);
        setLoadedForecastKey(key);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSpot.lat, activeSpot.lon]);

  const refreshForecast = useCallback(async () => {
    setManualRefreshing(true);
    const key = `${activeSpot.lat.toFixed(4)}_${activeSpot.lon.toFixed(4)}`;
    const bundle = await fetchSpotForecast(activeSpot.lat, activeSpot.lon, true);
    setForecastBundle(bundle);
    setLoadedForecastKey(key);
    setManualRefreshing(false);
  }, [activeSpot.lat, activeSpot.lon]);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        theme: prev.theme === 'night' ? 'sunlight' : 'night',
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateGeminiApiKey = useCallback((key: string) => {
    setSettings((prev) => {
      const next: AppSettings = { ...prev, geminiApiKey: key.trim() };
      saveSettings(next);
      return next;
    });
  }, []);

  const selectSpot = useCallback((spot: FishingSpot) => {
    setActiveSpot(spot);
    setIsManualHour(false);
  }, []);

  const setSelectedGenre = useCallback((genre: FishGenreId) => {
    setSelectedGenreState(genre);
    // 魚種タブをクリックした際は、タブに表示されている最高スコア時刻へ自動フォーカスし数値を一致させる
    setIsManualHour(false);
  }, []);

  const saveSpotToMySpots = useCallback((spot: FishingSpot) => {
    setMySpots((prev) => {
      const idx = prev.findIndex((s) => s.id === spot.id);
      const next =
        idx >= 0
          ? prev.map((s, i) => (i === idx ? spot : s))
          : [spot, ...prev];
      saveMySpots(next);
      return next;
    });
    setActiveSpot(spot);
    setIsManualHour(false);
  }, []);

  const updateSpotSeaDirection = useCallback((spotId: string, seaDirectionDeg: number) => {
    const normalized = ((Math.round(seaDirectionDeg) % 360) + 360) % 360;
    setActiveSpot((prev) =>
      prev.id === spotId ? { ...prev, seaDirectionDeg: normalized } : prev
    );
    setMySpots((prev) => {
      const exists = prev.some((s) => s.id === spotId);
      if (!exists) return prev;
      const next = prev.map((s) =>
        s.id === spotId ? { ...s, seaDirectionDeg: normalized } : s
      );
      saveMySpots(next);
      return next;
    });
  }, []);

  const removeMySpot = useCallback((spotId: string) => {
    setMySpots((prev) => {
      const filtered = prev.filter((s) => s.id !== spotId);
      const next = filtered.length > 0 ? filtered : INITIAL_PRESET_SPOTS;
      saveMySpots(next);
      setActiveSpot((curr) => (curr.id === spotId ? next[0] : curr));
      return next;
    });
  }, []);

  // 選択日の気象データ・潮汐データ・全6魚種評価を算出
  const safeDayIdx = Math.max(0, Math.min(dayIndex, forecastBundle.days.length - 1));
  const dailyWeather =
    forecastBundle.days[safeDayIdx] ??
    buildEstimatedForecast(activeSpot.lat, activeSpot.lon).days[0];

  const targetDateStr = dailyWeather.dateStr || getJstDateString(safeDayIdx);

  const dailyTide = useMemo(
    () => computeDailyTide(activeSpot.lat, activeSpot.lon, targetDateStr),
    [activeSpot.lat, activeSpot.lon, targetDateStr]
  );

  const genreEvaluations = useMemo(
    () => evaluateAllGenresForDay(dailyWeather, dailyTide, activeSpot),
    [dailyWeather, dailyTide, activeSpot]
  );

  const currentGenreEval = genreEvaluations[selectedGenre];

  const setDayIndex = useCallback((idx: number) => {
    setDayIndexState(idx);
    setIsManualHour(false);
  }, []);

  const setSelectedHour = useCallback((hour: number, isManual = true) => {
    const clamped = Math.max(0, Math.min(23, Math.round(hour)));
    setSelectedHourState(clamped);
    setIsManualHour(isManual);
  }, []);

  const jumpToCurrentHour = useCallback(() => {
    setSelectedHourState(getCurrentJstHour());
    setIsManualHour(true);
  }, []);

  const resetToAutoHour = useCallback(() => {
    setIsManualHour(false);
  }, []);

  // 初期表示および魚種タブ選択時(!isManualHour)は当該魚種の最高スコア時刻を返すことでタブ数値と完全一致させる
  const effectiveHour = isManualHour
    ? selectedHourState
    : currentGenreEval.peakHour;

  const currentHourScore =
    currentGenreEval.hourlyScores[effectiveHour] ?? currentGenreEval.hourlyScores[0];

  // =====================================================
  // 持ち物アクション
  // =====================================================
  const toggleGenreGearItem = useCallback((genreId: FishGenreId, itemId: string) => {
    setGearState((prev) => {
      const list = prev[genreId] ?? [];
      const next = {
        ...prev,
        [genreId]: list.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        ),
      };
      saveGearState(next);
      return next;
    });
  }, []);

  const addCustomGearItem = useCallback((genreId: FishGenreId, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setGearState((prev) => {
      const list = prev[genreId] ?? [];
      const newItem: GearChecklistItem = {
        id: `custom-${Date.now()}`,
        title: trimmed,
        subtitle: 'マイカスタム持ち物',
        icon: 'custom',
        checked: false,
        isCustom: true,
      };
      const next = {
        ...prev,
        [genreId]: [...list, newItem],
      };
      saveGearState(next);
      return next;
    });
  }, []);

  const removeCustomGearItem = useCallback((genreId: FishGenreId, itemId: string) => {
    setGearState((prev) => {
      const list = prev[genreId] ?? [];
      const next = {
        ...prev,
        [genreId]: list.filter((item) => item.id !== itemId),
      };
      saveGearState(next);
      return next;
    });
  }, []);

  const resetGenreGearChecks = useCallback((genreId: FishGenreId) => {
    setGearState((prev) => {
      const list = prev[genreId] ?? [];
      const next = {
        ...prev,
        [genreId]: list.map((item) => ({ ...item, checked: false })),
      };
      saveGearState(next);
      return next;
    });
    setWeatherGearChecked({});
    saveWeatherGearChecked({});
  }, []);

  const toggleWeatherGearItem = useCallback((itemId: string) => {
    setWeatherGearChecked((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      saveWeatherGearChecked(next);
      return next;
    });
  }, []);

  // =====================================================
  // 釣果ログアクション
  // =====================================================
  const addCatchLog = useCallback(
    async (entryInput: Omit<CatchLogEntry, 'id' | 'createdAt'>) => {
      const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullEntry: CatchLogEntry = {
        ...entryInput,
        id,
        createdAt: Date.now(),
      };

      if (fullEntry.photoDataUrl) {
        await savePhotoToIdb(id, fullEntry.photoDataUrl);
      }

      setCatchLogs((prev) => {
        const next = [fullEntry, ...prev];
        saveCatchLogsMeta(next);
        return next;
      });

      setCelebrationTrigger(Date.now());
    },
    []
  );

  const removeCatchLog = useCallback(async (id: string) => {
    await deletePhotoFromIdb(id);
    setCatchLogs((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveCatchLogsMeta(next);
      return next;
    });
  }, []);

  // =====================================================
  // バックアップ入出力
  // =====================================================
  const exportBackupJson = useCallback(async () => {
    const payload = await exportBackupPayload();
    return JSON.stringify(payload, null, 2);
  }, []);

  const importBackupJson = useCallback(async (jsonText: string) => {
    await importBackupPayload(jsonText);
    const loadedSettings = loadSettings();
    const loadedSpots = loadMySpots();
    const loadedGear = loadGearState();
    const loadedWx = loadWeatherGearChecked();
    const loadedLogs = loadCatchLogsMeta();
    const photos = await loadAllPhotosFromIdb();

    setSettings(loadedSettings);
    setMySpots(loadedSpots);
    if (loadedSpots.length > 0) setActiveSpot(loadedSpots[0]);
    setGearState(loadedGear);
    setWeatherGearChecked(loadedWx);
    setCatchLogs(
      loadedLogs.map((l) => ({ ...l, photoDataUrl: photos[l.id] || undefined }))
    );
  }, []);

  const value: AppContextValue = {
    hydrated,
    theme: settings.theme,
    toggleTheme,
    settings,
    updateGeminiApiKey,
    activeTab,
    setActiveTab,
    mySpots,
    activeSpot,
    selectSpot,
    saveSpotToMySpots,
    updateSpotSeaDirection,
    removeMySpot,
    dayIndex: safeDayIdx,
    setDayIndex,
    selectedGenre,
    setSelectedGenre,
    selectedHour: effectiveHour,
    setSelectedHour,
    jumpToCurrentHour,
    resetToAutoHour,
    isManualHour,
    isLoadingForecast,
    forecastSource: forecastBundle.source,
    refreshForecast,
    dailyWeather,
    dailyTide,
    genreEvaluations,
    currentGenreEval,
    currentHourScore,
    gearState,
    weatherGearChecked,
    toggleGenreGearItem,
    addCustomGearItem,
    removeCustomGearItem,
    resetGenreGearChecks,
    toggleWeatherGearItem,
    catchLogs,
    celebrationTrigger,
    addCatchLog,
    removeCatchLog,
    exportBackupJson,
    importBackupJson,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
