// The connected board, plus its settings and team list, shared by every screen.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { api, ApiError, Board, Division, Settings, SettingsPatch } from './api';

const STORE_KEY = 'scoreboard.board.v1';

type Ctx = {
  ready: boolean;              // finished reading the saved board from storage
  board: Board | null;
  settings: Settings | null;
  teams: Division[];
  offline: boolean;            // the last request couldn't reach the board
  error: string | null;
  connect: (b: Board) => Promise<void>;
  forget: () => Promise<void>;
  reload: () => Promise<void>;
  save: (patch: SettingsPatch) => Promise<void>;
  setOffline: (v: boolean) => void;
};

const BoardContext = createContext<Ctx | null>(null);

function merge(s: Settings, patch: SettingsPatch): Settings {
  return {
    ...s,
    ...patch,
    viewport: { ...s.viewport, ...(patch.viewport || {}) },
    animations: { ...s.animations, ...(patch.animations || {}) },
  } as Settings;
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [teams, setTeams] = useState<Division[]>([]);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boardRef = useRef<Board | null>(null);
  boardRef.current = board;

  const load = useCallback(async (b: Board) => {
    try {
      const [s, t] = await Promise.all([api.settings(b), api.teams(b)]);
      if (boardRef.current !== b) return;
      setSettings(s);
      setTeams(t);
      setOffline(false);
      setError(null);
    } catch (e) {
      if (boardRef.current !== b) return;
      setOffline(e instanceof ApiError && e.offline);
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then(raw => {
        const b = raw ? (JSON.parse(raw) as Board) : null;
        if (b?.host && b?.port) {
          boardRef.current = b;
          setBoard(b);
          load(b);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [load]);

  const connect = useCallback(async (b: Board) => {
    boardRef.current = b;
    setBoard(b);
    setSettings(null);
    setTeams([]);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(b)).catch(() => {});
    await load(b);
  }, [load]);

  const forget = useCallback(async () => {
    boardRef.current = null;
    setBoard(null);
    setSettings(null);
    setTeams([]);
    await AsyncStorage.removeItem(STORE_KEY).catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    if (boardRef.current) await load(boardRef.current);
  }, [load]);

  // Optimistic: the switch flips right away, then the board's cleaned-up copy replaces it.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const save = useCallback(async (patch: SettingsPatch) => {
    const b = boardRef.current;
    const before = settingsRef.current;
    if (!b || !before) return;
    setSettings(merge(before, patch));
    try {
      const fresh = await api.saveSettings(b, patch);
      if (boardRef.current === b) setSettings(fresh);
      setOffline(false);
    } catch (e) {
      if (boardRef.current === b) setSettings(before);
      setOffline(e instanceof ApiError && e.offline);
      Alert.alert("Couldn't save", (e as Error).message);
    }
  }, []);

  const value = useMemo(
    () => ({ ready, board, settings, teams, offline, error, connect, forget, reload, save, setOffline }),
    [ready, board, settings, teams, offline, error, connect, forget, reload, save],
  );
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): Ctx {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used inside BoardProvider');
  return ctx;
}
