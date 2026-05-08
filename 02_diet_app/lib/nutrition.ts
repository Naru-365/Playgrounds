import type {
  FoodItem,
  Nutrients,
  Profile,
  MealEntry,
  ExerciseEntry,
  GoalCourse,
} from "./types";

export const NUTRIENT_KEYS: (keyof Nutrients)[] = [
  "kcal",
  "protein",
  "fat",
  "carb",
  "fiber",
  "salt",
  "sugar",
  "calcium",
  "iron",
  "vitA",
  "vitB1",
  "vitB2",
  "vitC",
  "vitD",
  "vitE",
];

export const NUTRIENT_LABELS: Record<keyof Nutrients, string> = {
  kcal: "エネルギー",
  protein: "たんぱく質",
  fat: "脂質",
  carb: "炭水化物",
  fiber: "食物繊維",
  salt: "塩分",
  sugar: "糖質",
  calcium: "カルシウム",
  iron: "鉄",
  vitA: "ビタミンA",
  vitB1: "ビタミンB1",
  vitB2: "ビタミンB2",
  vitC: "ビタミンC",
  vitD: "ビタミンD",
  vitE: "ビタミンE",
};

export const NUTRIENT_UNITS: Record<keyof Nutrients, string> = {
  kcal: "kcal",
  protein: "g",
  fat: "g",
  carb: "g",
  fiber: "g",
  salt: "g",
  sugar: "g",
  calcium: "mg",
  iron: "mg",
  vitA: "μg",
  vitB1: "mg",
  vitB2: "mg",
  vitC: "mg",
  vitD: "μg",
  vitE: "mg",
};

export function emptyNutrients(): Nutrients {
  return {
    kcal: 0,
    protein: 0,
    fat: 0,
    carb: 0,
    fiber: 0,
    salt: 0,
    sugar: 0,
    calcium: 0,
    iron: 0,
    vitA: 0,
    vitB1: 0,
    vitB2: 0,
    vitC: 0,
    vitD: 0,
    vitE: 0,
  };
}

export function scaleFood(food: FoodItem, amount: number): Nutrients {
  const ratio = amount / food.per;
  const out = emptyNutrients();
  for (const k of NUTRIENT_KEYS) {
    out[k] = Number(((food[k] as number) * ratio).toFixed(2));
  }
  return out;
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const out = emptyNutrients();
  for (const item of items) {
    for (const k of NUTRIENT_KEYS) {
      out[k] += item[k] || 0;
    }
  }
  for (const k of NUTRIENT_KEYS) {
    out[k] = Number(out[k].toFixed(2));
  }
  return out;
}

export function bmr(profile: Profile): number {
  // Mifflin–St Jeor
  const { weight, height, age, sex } = profile;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

const ACTIVITY_FACTOR = { low: 1.4, mid: 1.65, high: 1.85 } as const;

export function tdee(profile: Profile): number {
  return bmr(profile) * ACTIVITY_FACTOR[profile.activity];
}

export function dailyKcalTarget(profile: Profile): number {
  const base = tdee(profile);
  switch (profile.goal) {
    case "diet":
      return Math.round(base - 350);
    case "muscle":
      return Math.round(base + 250);
    case "lowcarb":
      return Math.round(base - 200);
    default:
      return Math.round(base);
  }
}

export function pfcTarget(profile: Profile): { protein: number; fat: number; carb: number } {
  const kcal = dailyKcalTarget(profile);
  let pRatio = 0.2,
    fRatio = 0.25,
    cRatio = 0.55;
  if (profile.goal === "muscle") {
    pRatio = 0.3;
    fRatio = 0.25;
    cRatio = 0.45;
  } else if (profile.goal === "lowcarb") {
    pRatio = 0.3;
    fRatio = 0.45;
    cRatio = 0.25;
  } else if (profile.goal === "diet") {
    pRatio = 0.27;
    fRatio = 0.28;
    cRatio = 0.45;
  }
  return {
    protein: Math.round((kcal * pRatio) / 4),
    fat: Math.round((kcal * fRatio) / 9),
    carb: Math.round((kcal * cRatio) / 4),
  };
}

export function nutrientTarget(profile: Profile): Nutrients {
  const k = dailyKcalTarget(profile);
  const pfc = pfcTarget(profile);
  return {
    kcal: k,
    protein: pfc.protein,
    fat: pfc.fat,
    carb: pfc.carb,
    fiber: profile.sex === "male" ? 21 : 18,
    salt: profile.sex === "male" ? 7.5 : 6.5,
    sugar: profile.goal === "lowcarb" ? 100 : pfc.carb - 25,
    calcium: 700,
    iron: profile.sex === "male" ? 7.5 : 10.5,
    vitA: 800,
    vitB1: 1.2,
    vitB2: 1.4,
    vitC: 100,
    vitD: 8.5,
    vitE: 6.5,
  };
}

export type Status = "low" | "ok" | "high";

export function nutrientStatus(value: number, target: number, isUpper = false): Status {
  if (target <= 0) return "ok";
  const r = value / target;
  if (isUpper) {
    if (r > 1.1) return "high";
    if (r > 0.7) return "ok";
    return "low";
  }
  if (r < 0.7) return "low";
  if (r > 1.3) return "high";
  return "ok";
}

const UPPER_BOUND_KEYS: (keyof Nutrients)[] = ["kcal", "fat", "salt", "sugar"];

export function isUpperBound(key: keyof Nutrients): boolean {
  return UPPER_BOUND_KEYS.includes(key);
}

export function dailyTotals(
  meals: MealEntry[],
  exercises: ExerciseEntry[],
  dateISO: string
): { intake: Nutrients; burnedKcal: number } {
  const todays = meals.filter((m) => m.dateISO === dateISO);
  const intake = sumNutrients(todays.map((t) => t.nutrients));
  const burnedKcal = exercises
    .filter((e) => e.dateISO === dateISO)
    .reduce((s, e) => s + (e.kcal || 0), 0);
  return { intake, burnedKcal };
}

export function score(intake: Nutrients, target: Nutrients): number {
  // Simple deviation-based score 0–100
  let total = 0;
  let count = 0;
  for (const k of NUTRIENT_KEYS) {
    const t = target[k];
    if (!t) continue;
    const ratio = intake[k] / t;
    let s: number;
    if (isUpperBound(k)) {
      s = ratio <= 1 ? 100 : Math.max(0, 100 - (ratio - 1) * 200);
    } else {
      // ideal at 1.0; below 1 → linear; above 1 → small penalty
      s = ratio < 1 ? Math.max(0, ratio * 100) : Math.max(0, 100 - (ratio - 1) * 80);
    }
    total += s;
    count += 1;
  }
  return Math.round(total / Math.max(1, count));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function shiftDate(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekStartISO(dateISO: string): string {
  const d = new Date(dateISO);
  const day = d.getDay(); // 0 Sunday
  const offset = day === 0 ? -6 : 1 - day; // Monday-based week
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const COURSE_LABEL: Record<GoalCourse, string> = {
  diet: "ダイエット",
  muscle: "筋力アップ",
  maintain: "体型維持",
  lowcarb: "低糖質",
};
