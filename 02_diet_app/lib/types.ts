export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type GoalCourse = "diet" | "muscle" | "maintain" | "lowcarb";

export type Sex = "male" | "female";
export type ActivityLevel = "low" | "mid" | "high";

export type Profile = {
  name: string;
  height: number;
  weight: number;
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: GoalCourse;
  targetWeight?: number;
  targetDate?: string;
  apiKey?: string;
};

export type Nutrients = {
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  fiber: number;
  salt: number;
  sugar: number;
  calcium: number;
  iron: number;
  vitA: number;
  vitB1: number;
  vitB2: number;
  vitC: number;
  vitD: number;
  vitE: number;
};

export type FoodItem = {
  id: string;
  name: string;
  category: string;
  per: number;
  unit: "g" | "piece" | "ml";
} & Nutrients;

export type MealEntry = {
  id: string;
  dateISO: string;
  slot: MealSlot;
  foodId?: string;
  customName?: string;
  amount: number;
  unit: "g" | "piece" | "ml";
  nutrients: Nutrients;
};

export type WeightEntry = {
  dateISO: string;
  weight: number;
  bodyFat?: number;
  memo?: string;
};

export type ExerciseType = "cardio" | "strength" | "stretch" | "other";

export type ExerciseEntry = {
  id: string;
  dateISO: string;
  type: ExerciseType;
  name: string;
  minutes?: number;
  sets?: { reps: number; weight?: number }[];
  kcal: number;
};

export type PlanItem = {
  name: string;
  sets: number;
  reps: string;
  restSec?: number;
  note?: string;
};

export type WorkoutDay = {
  dayIndex: number;
  focus: string;
  items: PlanItem[];
};

export type WorkoutPlan = {
  weekStartISO: string;
  proteinTargetG: number;
  notesFromAI: string;
  days: WorkoutDay[];
};

export type WorkoutLogEntry = {
  weekStartISO: string;
  dayIndex: number;
  itemIndex: number;
  setIndex: number;
  reps?: number;
  weight?: number;
  doneAt: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ts: string;
};

export type AppData = {
  profile: Profile;
  meals: MealEntry[];
  weights: WeightEntry[];
  exercises: ExerciseEntry[];
  myFoods: FoodItem[];
  plan?: WorkoutPlan;
  planLogs: WorkoutLogEntry[];
  chat: ChatMessage[];
};
