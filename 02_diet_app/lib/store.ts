"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type {
  AppData,
  Profile,
  MealEntry,
  WeightEntry,
  ExerciseEntry,
  WorkoutPlan,
  WorkoutLogEntry,
  ChatMessage,
  FoodItem,
} from "./types";

const KEY = "karute.v1";

const DEFAULT_PROFILE: Profile = {
  name: "松本",
  height: 172,
  weight: 70,
  age: 32,
  sex: "male",
  activity: "mid",
  goal: "diet",
  targetWeight: 65,
};

const DEFAULT_DATA: AppData = {
  profile: DEFAULT_PROFILE,
  meals: [],
  weights: [],
  exercises: [],
  myFoods: [],
  planLogs: [],
  chat: [],
};

let memory: AppData | null = null;
const listeners = new Set<() => void>();

function load(): AppData {
  if (memory) return memory;
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      memory = DEFAULT_DATA;
      return memory;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    memory = { ...DEFAULT_DATA, ...parsed, profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) } };
    return memory;
  } catch {
    memory = DEFAULT_DATA;
    return memory;
  }
}

function save(data: AppData) {
  memory = data;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppData {
  return load();
}

function getServerSnapshot(): AppData {
  return DEFAULT_DATA;
}

export function useAppData() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((patch: Partial<AppData> | ((d: AppData) => Partial<AppData>)) => {
    const cur = load();
    const next = typeof patch === "function" ? patch(cur) : patch;
    save({ ...cur, ...next });
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    const cur = load();
    save({ ...cur, profile: { ...cur.profile, ...p } });
  }, []);

  const addMeal = useCallback((m: MealEntry) => {
    const cur = load();
    save({ ...cur, meals: [...cur.meals, m] });
  }, []);

  const removeMeal = useCallback((id: string) => {
    const cur = load();
    save({ ...cur, meals: cur.meals.filter((x) => x.id !== id) });
  }, []);

  const addWeight = useCallback((w: WeightEntry) => {
    const cur = load();
    const filtered = cur.weights.filter((x) => x.dateISO !== w.dateISO);
    save({ ...cur, weights: [...filtered, w].sort((a, b) => a.dateISO.localeCompare(b.dateISO)) });
  }, []);

  const addExercise = useCallback((e: ExerciseEntry) => {
    const cur = load();
    save({ ...cur, exercises: [...cur.exercises, e] });
  }, []);

  const removeExercise = useCallback((id: string) => {
    const cur = load();
    save({ ...cur, exercises: cur.exercises.filter((x) => x.id !== id) });
  }, []);

  const addMyFood = useCallback((f: FoodItem) => {
    const cur = load();
    save({ ...cur, myFoods: [...cur.myFoods, f] });
  }, []);

  const setPlan = useCallback((plan: WorkoutPlan) => {
    const cur = load();
    save({ ...cur, plan });
  }, []);

  const logSet = useCallback((entry: WorkoutLogEntry) => {
    const cur = load();
    save({ ...cur, planLogs: [...cur.planLogs, entry] });
  }, []);

  const addChat = useCallback((m: ChatMessage) => {
    const cur = load();
    save({ ...cur, chat: [...cur.chat, m] });
  }, []);

  const clearChat = useCallback(() => {
    const cur = load();
    save({ ...cur, chat: [] });
  }, []);

  const exportJSON = useCallback(() => {
    return JSON.stringify(load(), null, 2);
  }, []);

  const importJSON = useCallback((raw: string) => {
    const parsed = JSON.parse(raw) as AppData;
    save(parsed);
  }, []);

  return {
    data,
    update,
    updateProfile,
    addMeal,
    removeMeal,
    addWeight,
    addExercise,
    removeExercise,
    addMyFood,
    setPlan,
    logSet,
    addChat,
    clearChat,
    exportJSON,
    importJSON,
  };
}

export function useHydrated(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
