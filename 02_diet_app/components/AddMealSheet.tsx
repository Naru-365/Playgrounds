"use client";
import { useEffect, useMemo, useState } from "react";
import { searchFoods } from "@/lib/foods";
import { scaleFood } from "@/lib/nutrition";
import type { FoodItem, MealEntry, MealSlot } from "@/lib/types";

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

type Mode = "search" | "ai" | "photo";

type Props = {
  open: boolean;
  slot: MealSlot;
  date: string;
  apiKey?: string;
  myFoods: FoodItem[];
  onClose: () => void;
  onAdd: (entries: MealEntry[]) => void;
};

export default function AddMealSheet({ open, slot, date, apiKey, myFoods, onClose, onAdd }: Props) {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode("search");
      setQuery("");
      setPicked(null);
      setAmount(0);
      setAiText("");
      setError("");
    }
  }, [open]);

  const results = useMemo(() => {
    if (mode !== "search") return [];
    return [...myFoods.filter((f) => f.name.includes(query)), ...searchFoods(query)].slice(0, 30);
  }, [query, mode, myFoods]);

  if (!open) return null;

  const submitPicked = () => {
    if (!picked) return;
    const a = amount || picked.per;
    const entry: MealEntry = {
      id: crypto.randomUUID(),
      dateISO: date,
      slot,
      foodId: picked.id,
      amount: a,
      unit: picked.unit,
      nutrients: scaleFood(picked, a),
    };
    onAdd([entry]);
  };

  const aiHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-gemini-key": apiKey } : {}),
  };

  const submitAI = async () => {
    if (!aiText.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/parse-text", {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({ text: aiText }),
      });
      const json = await res.json();
      if (!json.items?.length) throw new Error(json.error || "認識できませんでした");
      const entries: MealEntry[] = json.items.map((it: AIItem) => ({
        id: crypto.randomUUID(),
        dateISO: date,
        slot,
        customName: it.name,
        amount: it.amount_g ?? 100,
        unit: "g",
        nutrients: {
          kcal: it.kcal ?? 0,
          protein: it.protein ?? 0,
          fat: it.fat ?? 0,
          carb: it.carb ?? 0,
          fiber: it.fiber ?? 0,
          salt: it.salt ?? 0,
          sugar: it.sugar ?? it.carb ?? 0,
          calcium: it.calcium ?? 0,
          iron: it.iron ?? 0,
          vitA: 0,
          vitB1: 0,
          vitB2: 0,
          vitC: it.vitC ?? 0,
          vitD: 0,
          vitE: 0,
        },
      }));
      onAdd(entries);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitPhoto = async (file: File) => {
    setPhotoBusy(true);
    setError("");
    try {
      const b64 = await fileToBase64(file);
      const res = await fetch("/api/photo", {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({ image: b64, mediaType: file.type || "image/jpeg" }),
      });
      const json = await res.json();
      if (!json.items?.length) throw new Error(json.error || "認識できませんでした");
      const entries: MealEntry[] = json.items.map((it: AIItem) => ({
        id: crypto.randomUUID(),
        dateISO: date,
        slot,
        customName: it.name,
        amount: it.amount_g ?? 100,
        unit: "g",
        nutrients: {
          kcal: it.kcal ?? 0,
          protein: it.protein ?? 0,
          fat: it.fat ?? 0,
          carb: it.carb ?? 0,
          fiber: it.fiber ?? 0,
          salt: it.salt ?? 0,
          sugar: it.sugar ?? it.carb ?? 0,
          calcium: it.calcium ?? 0,
          iron: it.iron ?? 0,
          vitA: 0,
          vitB1: 0,
          vitB2: 0,
          vitC: it.vitC ?? 0,
          vitD: 0,
          vitE: 0,
        },
      }));
      onAdd(entries);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="mx-auto max-h-[90dvh] w-full max-w-[480px] overflow-hidden rounded-t-3xl bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div className="text-sm font-semibold">{SLOT_LABEL[slot]} を追加</div>
          <button onClick={onClose} className="text-[var(--ink-soft)]">✕</button>
        </div>

        <div className="grid grid-cols-3 border-b border-[var(--line)] text-[12px]">
          {(["search", "ai", "photo"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2 ${
                mode === m
                  ? "border-b-2 border-[var(--primary)] text-[var(--primary)] font-semibold"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              {m === "search" ? "検索" : m === "ai" ? "AIで書く" : "写真"}
            </button>
          ))}
        </div>

        <div className="max-h-[60dvh] overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-md bg-[var(--warn)]/10 px-3 py-2 text-xs text-[var(--warn)]">{error}</div>
          )}
          {mode === "search" && (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="食品名で検索"
                className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
              {!picked ? (
                <ul className="divide-y divide-[var(--line)]">
                  {results.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => {
                          setPicked(it);
                          setAmount(it.per);
                        }}
                        className="flex w-full items-center justify-between py-2 text-left"
                      >
                        <div>
                          <div className="text-sm">{it.name}</div>
                          <div className="text-[11px] text-[var(--ink-soft)]">
                            {it.per}{it.unit} あたり {Math.round(it.kcal)} kcal
                          </div>
                        </div>
                        <span className="text-[var(--primary)]">＋</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <div className="mb-3 rounded-lg bg-[var(--bg)] p-3">
                    <div className="text-sm font-semibold">{picked.name}</div>
                    <div className="text-[11px] text-[var(--ink-soft)]">
                      {picked.per}{picked.unit} = {Math.round(picked.kcal)} kcal / P {picked.protein}g F {picked.fat}g C {picked.carb}g
                    </div>
                  </div>
                  <label className="mb-3 block text-xs text-[var(--ink-soft)]">
                    量 ({picked.unit})
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="text-[12px] text-[var(--ink-soft)]">
                    推定 {Math.round((amount / picked.per) * picked.kcal)} kcal
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setPicked(null)} className="flex-1 rounded-lg border border-[var(--line)] py-2 text-sm">戻る</button>
                    <button onClick={submitPicked} className="flex-1 rounded-lg bg-[var(--primary)] py-2 text-sm font-semibold text-white">追加</button>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === "ai" && (
            <>
              <p className="mb-2 text-[11px] text-[var(--ink-soft)]">
                例: 「コンビニのおにぎり2個と味噌汁とサラダチキン」など、口語で書いてください。AIが品目と量を推定します。
              </p>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                placeholder="食べたものを自由に書いてください"
              />
              <button
                onClick={submitAI}
                disabled={busy || !aiText.trim()}
                className="mt-3 w-full rounded-lg bg-[var(--primary)] py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "AIに認識中…" : "AIで記録"}
              </button>
            </>
          )}

          {mode === "photo" && (
            <>
              <p className="mb-3 text-[11px] text-[var(--ink-soft)]">
                料理を撮影 / 既存の写真を選ぶと、Claudeが品目と量を推定します。
              </p>
              <label className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--ink-soft)]">
                {photoBusy ? "解析中…" : "📷 写真を選択 / 撮影"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={photoBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) submitPhoto(f);
                  }}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type AIItem = {
  name: string;
  amount_g?: number;
  kcal?: number;
  protein?: number;
  fat?: number;
  carb?: number;
  fiber?: number;
  salt?: number;
  sugar?: number;
  calcium?: number;
  iron?: number;
  vitC?: number;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
