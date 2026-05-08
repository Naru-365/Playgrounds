import type { FoodItem } from "./types";

const f = (
  id: string,
  name: string,
  category: string,
  per: number,
  unit: "g" | "piece" | "ml",
  kcal: number,
  protein: number,
  fat: number,
  carb: number,
  extra: Partial<FoodItem> = {}
): FoodItem => ({
  id,
  name,
  category,
  per,
  unit,
  kcal,
  protein,
  fat,
  carb,
  fiber: 0,
  salt: 0,
  sugar: carb,
  calcium: 0,
  iron: 0,
  vitA: 0,
  vitB1: 0,
  vitB2: 0,
  vitC: 0,
  vitD: 0,
  vitE: 0,
  ...extra,
});

export const FOODS: FoodItem[] = [
  f("rice-white", "白ごはん", "主食", 150, "g", 252, 3.8, 0.5, 55.7, { fiber: 0.5, salt: 0 }),
  f("rice-brown", "玄米ごはん", "主食", 150, "g", 248, 4.2, 1.5, 53.4, { fiber: 2.1 }),
  f("onigiri-salmon", "おにぎり 鮭", "主食", 110, "piece", 200, 4.5, 1.5, 39.0, { salt: 1.2 }),
  f("onigiri-ume", "おにぎり 梅", "主食", 110, "piece", 180, 3.5, 0.5, 38.0, { salt: 1.4 }),
  f("toast", "食パン6枚切", "主食", 60, "piece", 158, 5.6, 2.6, 27.9, { fiber: 1.4 }),
  f("udon", "うどん 1玉", "主食", 230, "piece", 242, 6.0, 1.0, 50.0, { salt: 0.8 }),
  f("soba", "そば 1玉", "主食", 200, "piece", 264, 9.6, 2.0, 52.0),
  f("ramen", "ラーメン", "主食", 500, "piece", 480, 18, 13, 70, { salt: 5.5 }),
  f("pasta-tomato", "パスタ ミートソース", "主食", 350, "piece", 590, 22, 18, 80, { salt: 3.0, fiber: 4 }),
  f("egg", "卵", "たんぱく", 50, "piece", 76, 6.2, 5.2, 0.2, { vitA: 75, vitD: 0.6 }),
  f("natto", "納豆 1パック", "たんぱく", 45, "piece", 90, 7.4, 4.5, 5.4, { fiber: 3.0 }),
  f("tofu", "絹豆腐", "たんぱく", 150, "g", 84, 7.5, 4.5, 3.0, { calcium: 110 }),
  f("salmon-grilled", "焼き鮭", "たんぱく", 80, "piece", 160, 17.8, 8.6, 0.1, { vitD: 25 }),
  f("chicken-breast", "鶏むね肉(皮なし)", "たんぱく", 100, "g", 108, 22.3, 1.5, 0, {}),
  f("chicken-thigh", "鶏もも肉(皮なし)", "たんぱく", 100, "g", 127, 19.0, 5.0, 0, {}),
  f("beef-lean", "牛もも肉 赤身", "たんぱく", 100, "g", 165, 21.2, 7.6, 0.5, {}),
  f("pork-loin", "豚ロース", "たんぱく", 100, "g", 263, 19.3, 19.2, 0.2, {}),
  f("tuna-sashimi", "まぐろ刺身 5切", "たんぱく", 80, "piece", 100, 21.0, 1.1, 0.1, {}),
  f("greek-yogurt", "ギリシャヨーグルト 無糖", "たんぱく", 100, "g", 59, 10.0, 0.4, 3.6, { calcium: 110 }),
  f("milk", "牛乳", "たんぱく", 200, "ml", 134, 6.6, 7.6, 9.6, { calcium: 220 }),
  f("salad-green", "葉野菜サラダ", "野菜", 100, "g", 25, 1.5, 0.2, 4.0, { fiber: 2.5, vitC: 25, vitA: 200 }),
  f("broccoli", "ブロッコリー 茹で", "野菜", 100, "g", 33, 3.5, 0.4, 5.2, { fiber: 4.4, vitC: 54 }),
  f("tomato", "トマト", "野菜", 150, "piece", 28, 1.0, 0.2, 6.5, { fiber: 1.5, vitC: 22 }),
  f("kimchi", "キムチ", "野菜", 50, "g", 23, 1.4, 0.1, 4.0, { salt: 1.3, fiber: 1.4 }),
  f("miso-soup", "味噌汁", "汁物", 200, "ml", 50, 3.5, 1.5, 5.5, { salt: 1.5 }),
  f("apple", "りんご", "果物", 200, "piece", 108, 0.4, 0.4, 28.6, { fiber: 3.0, vitC: 8 }),
  f("banana", "バナナ", "果物", 100, "piece", 86, 1.1, 0.2, 22.5, { fiber: 1.1 }),
  f("protein-shake", "プロテイン 1杯", "たんぱく", 30, "g", 117, 24, 1.5, 2.5, { calcium: 200 }),
  f("rice-ball-tuna-mayo", "ツナマヨおにぎり", "主食", 110, "piece", 230, 4.5, 7.0, 36.0, { salt: 1.3 }),
  f("convenience-salad-chicken", "サラダチキン 1袋", "たんぱく", 110, "piece", 121, 26.4, 1.4, 0.5, { salt: 1.0 }),
  f("oatmeal", "オートミール 30g", "主食", 30, "g", 105, 4.1, 1.7, 20.7, { fiber: 2.8 }),
  f("almond", "アーモンド 10粒", "間食", 12, "piece", 73, 2.4, 6.6, 2.5, { fiber: 1.2, vitE: 3.6 }),
  f("dark-chocolate", "ダークチョコ 1片", "間食", 10, "piece", 56, 0.8, 4.0, 4.5, { fiber: 0.6 }),
  f("beer-350", "ビール 350ml", "飲料", 350, "ml", 140, 1.0, 0, 10.5, {}),
  f("coffee-black", "ブラックコーヒー", "飲料", 200, "ml", 8, 0.4, 0, 1.4, {}),
];

export function searchFoods(query: string): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return FOODS.slice(0, 20);
  return FOODS.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 30);
}

export function findFoodById(id: string): FoodItem | undefined {
  return FOODS.find((f) => f.id === id);
}
