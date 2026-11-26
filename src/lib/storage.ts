import { DEFAULT_GENRE_GEAR } from '@/config/gearPresets';
import { INITIAL_PRESET_SPOTS } from '@/config/presetSpots';
import {
  AppSettings,
  BackupPayload,
  CatchLogEntry,
  FishGenreId,
  FishingSpot,
  GearChecklistItem,
} from '@/types';

const KEYS = {
  SETTINGS: 'tsuripulse_settings_v1',
  MY_SPOTS: 'tsuripulse_myspots_v1',
  GEAR: 'tsuripulse_gear_v1',
  WEATHER_GEAR_CHECKED: 'tsuripulse_wx_gear_v1',
  CATCH_LOGS: 'tsuripulse_catch_logs_v1',
} as const;

const IDB_NAME = 'tsuripulse_idb_v1';
const IDB_PHOTO_STORE = 'catch_photos';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'night',
  geminiApiKey: '',
};

// =====================================================
// LocalStorage Helpers
// =====================================================

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: parsed.theme === 'sunlight' ? 'sunlight' : 'night',
      geminiApiKey: typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey : '',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadMySpots(): FishingSpot[] {
  if (typeof window === 'undefined') return INITIAL_PRESET_SPOTS;
  try {
    const raw = localStorage.getItem(KEYS.MY_SPOTS);
    if (!raw) {
      localStorage.setItem(KEYS.MY_SPOTS, JSON.stringify(INITIAL_PRESET_SPOTS));
      return INITIAL_PRESET_SPOTS;
    }
    const parsed = JSON.parse(raw) as FishingSpot[];
    return parsed.length > 0 ? parsed : INITIAL_PRESET_SPOTS;
  } catch {
    return INITIAL_PRESET_SPOTS;
  }
}

export function saveMySpots(spots: FishingSpot[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.MY_SPOTS, JSON.stringify(spots));
}

export function loadGearState(): Record<FishGenreId, GearChecklistItem[]> {
  if (typeof window === 'undefined') return DEFAULT_GENRE_GEAR;
  try {
    const raw = localStorage.getItem(KEYS.GEAR);
    if (!raw) return structuredClone(DEFAULT_GENRE_GEAR);
    const parsed = JSON.parse(raw) as Record<FishGenreId, GearChecklistItem[]>;
    return {
      ...structuredClone(DEFAULT_GENRE_GEAR),
      ...parsed,
    };
  } catch {
    return structuredClone(DEFAULT_GENRE_GEAR);
  }
}

export function saveGearState(state: Record<FishGenreId, GearChecklistItem[]>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.GEAR, JSON.stringify(state));
}

export function loadWeatherGearChecked(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEYS.WEATHER_GEAR_CHECKED);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveWeatherGearChecked(map: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.WEATHER_GEAR_CHECKED, JSON.stringify(map));
}

export function loadCatchLogsMeta(): CatchLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.CATCH_LOGS);
    return raw ? (JSON.parse(raw) as CatchLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCatchLogsMeta(logs: CatchLogEntry[]): void {
  if (typeof window === 'undefined') return;
  // LocalStorage側には重いphotoDataUrlを除いたメタデータのみ保存し容量上限を回避
  const stripped = logs.map(({ photoDataUrl: _unused, ...rest }) => {
    void _unused;
    return rest;
  });
  localStorage.setItem(KEYS.CATCH_LOGS, JSON.stringify(stripped));
}

// =====================================================
// IndexedDB Photo Storage (圧縮済みの釣果写真保存用)
// =====================================================

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_PHOTO_STORE)) {
        db.createObjectStore(IDB_PHOTO_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePhotoToIdb(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openPhotoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_PHOTO_STORE, 'readwrite');
      tx.objectStore(IDB_PHOTO_STORE).put({ id, dataUrl });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore IDB errors
  }
}

export async function deletePhotoFromIdb(id: string): Promise<void> {
  try {
    const db = await openPhotoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_PHOTO_STORE, 'readwrite');
      tx.objectStore(IDB_PHOTO_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function loadAllPhotosFromIdb(): Promise<Record<string, string>> {
  try {
    const db = await openPhotoDb();
    const map: Record<string, string> = {};
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_PHOTO_STORE, 'readonly');
      const req = tx.objectStore(IDB_PHOTO_STORE).getAll();
      req.onsuccess = () => {
        const items = req.result as { id: string; dataUrl: string }[];
        for (const item of items) {
          map[item.id] = item.dataUrl;
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return map;
  } catch {
    return {};
  }
}

// =====================================================
// JSON 一括エクスポート / インポート
// =====================================================

export async function exportBackupPayload(): Promise<BackupPayload> {
  const photosMap = await loadAllPhotosFromIdb();
  const logsMeta = loadCatchLogsMeta();
  const catchLogsWithPhotos: CatchLogEntry[] = logsMeta.map((log) => ({
    ...log,
    photoDataUrl: photosMap[log.id] || undefined,
  }));

  return {
    app: 'TsuriPulse',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    mySpots: loadMySpots(),
    gearState: loadGearState(),
    weatherGearChecked: loadWeatherGearChecked(),
    catchLogs: catchLogsWithPhotos,
  };
}

export async function importBackupPayload(jsonText: string): Promise<void> {
  const parsed = JSON.parse(jsonText) as Partial<BackupPayload>;
  if (parsed.app !== 'TsuriPulse') {
    throw new Error('ツリパルス用のバックアップJSONファイルではありません。');
  }

  if (parsed.settings) saveSettings(parsed.settings);
  if (Array.isArray(parsed.mySpots) && parsed.mySpots.length > 0) {
    saveMySpots(parsed.mySpots);
  }
  if (parsed.gearState) {
    saveGearState(parsed.gearState as Record<FishGenreId, GearChecklistItem[]>);
  }
  if (parsed.weatherGearChecked) {
    saveWeatherGearChecked(parsed.weatherGearChecked);
  }
  if (Array.isArray(parsed.catchLogs)) {
    for (const entry of parsed.catchLogs) {
      if (entry.photoDataUrl) {
        await savePhotoToIdb(entry.id, entry.photoDataUrl);
      }
    }
    saveCatchLogsMeta(parsed.catchLogs);
  }
}
