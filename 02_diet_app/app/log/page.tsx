"use client";
import { useMemo, useState } from "react";
import Card from "@/components/Card";
import DateBar from "@/components/DateBar";
import AddMealSheet from "@/components/AddMealSheet";
import { useAppData, useHydrated } from "@/lib/store";
import { todayISO } from "@/lib/nutrition";
import type { ExerciseEntry, ExerciseType, MealEntry, MealSlot, WeightEntry } from "@/lib/types";

const SLOTS: { key: MealSlot; label: string; icon: string }[] = [
  { key: "breakfast", label: "朝食", icon: "🌅" },
  { key: "lunch", label: "昼食", icon: "🌞" },
  { key: "dinner", label: "夕食", icon: "🌙" },
  { key: "snack", label: "間食", icon: "🍫" },
];

type Tab = "meal" | "exercise" | "weight";

export default function LogPage() {
  const hydrated = useHydrated();
  const { data, addMeal, removeMeal, addExercise, removeExercise, addWeight } = useAppData();
  const [tab, setTab] = useState<Tab>("meal");
  const [date, setDate] = useState(todayISO());
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<MealSlot>("breakfast");

  const todaysMeals = useMemo(
    () => data.meals.filter((m) => m.dateISO === date),
    [data.meals, date]
  );

  const handleAdd = (entries: MealEntry[]) => {
    entries.forEach(addMeal);
    setOpen(false);
  };

  if (!hydrated) {
    return <div className="grid h-dvh place-items-center text-[var(--ink-soft)]">読み込み中…</div>;
  }

  return (
    <div>
      <header className="px-4 pt-4">
        <h1 className="text-lg font-semibold">記録</h1>
      </header>
      <DateBar date={date} onChange={setDate} />
      <div className="mx-4 grid grid-cols-3 rounded-full bg-[var(--line)] p-1 text-xs">
        {(["meal", "exercise", "weight"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full py-1.5 ${tab === t ? "bg-[var(--surface)] font-semibold" : "text-[var(--ink-soft)]"}`}
          >
            {t === "meal" ? "食事" : t === "exercise" ? "運動" : "体重"}
          </button>
        ))}
      </div>

      {tab === "meal" && (
        <>
          {SLOTS.map((s) => {
            const items = todaysMeals.filter((m) => m.slot === s.key);
            const total = items.reduce((sum, m) => sum + m.nutrients.kcal, 0);
            return (
              <Card
                key={s.key}
                title={`${s.icon} ${s.label}`}
                action={
                  <div className="flex items-center gap-2">
                    <span className="tabular text-xs text-[var(--ink-soft)]">{Math.round(total)} kcal</span>
                    <button
                      onClick={() => {
                        setSlot(s.key);
                        setOpen(true);
                      }}
                      className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
                    >
                      ＋ 追加
                    </button>
                  </div>
                }
              >
                {items.length === 0 ? (
                  <div className="py-3 text-center text-[12px] text-[var(--ink-soft)]">未記録</div>
                ) : (
                  <ul className="divide-y divide-[var(--line)]">
                    {items.map((m) => (
                      <li key={m.id} className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-sm">
                            {m.customName || data.myFoods.find((f) => f.id === m.foodId)?.name || foodName(m.foodId)}
                          </div>
                          <div className="text-[11px] text-[var(--ink-soft)]">
                            {m.amount}{m.unit} · {Math.round(m.nutrients.kcal)}kcal · P{m.nutrients.protein.toFixed(1)} F{m.nutrients.fat.toFixed(1)} C{m.nutrients.carb.toFixed(1)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMeal(m.id)}
                          className="text-[var(--ink-soft)] active:opacity-60"
                          aria-label="削除"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </>
      )}

      {tab === "exercise" && (
        <ExerciseTab
          date={date}
          entries={data.exercises.filter((e) => e.dateISO === date)}
          onAdd={addExercise}
          onRemove={removeExercise}
        />
      )}
      {tab === "weight" && (
        <WeightTab date={date} latest={data.weights.find((w) => w.dateISO === date)} onSave={addWeight} />
      )}

      <AddMealSheet
        open={open}
        slot={slot}
        date={date}
        apiKey={data.profile.apiKey}
        myFoods={data.myFoods}
        onClose={() => setOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}

function foodName(id?: string): string {
  if (!id) return "—";
  // lazy import to avoid bundling FOODS in client when unused
  const { FOODS } = require("@/lib/foods") as typeof import("@/lib/foods");
  return FOODS.find((f) => f.id === id)?.name ?? "—";
}

const EX_TYPES: { v: ExerciseType; label: string; mets: number }[] = [
  { v: "cardio", label: "ランニング", mets: 9 },
  { v: "cardio", label: "ウォーキング", mets: 4 },
  { v: "cardio", label: "サイクリング", mets: 7 },
  { v: "strength", label: "筋トレ(中強度)", mets: 5 },
  { v: "strength", label: "筋トレ(高強度)", mets: 8 },
  { v: "stretch", label: "ストレッチ", mets: 2.3 },
  { v: "other", label: "ヨガ", mets: 3 },
];

function ExerciseTab({
  date,
  entries,
  onAdd,
  onRemove,
}: {
  date: string;
  entries: ExerciseEntry[];
  onAdd: (e: ExerciseEntry) => void;
  onRemove: (id: string) => void;
}) {
  const { data } = useAppData();
  const [type, setType] = useState(EX_TYPES[0]);
  const [minutes, setMinutes] = useState(30);

  const kcal = useMemo(
    () => Math.round((type.mets * (data.profile.weight || 60) * minutes) / 60),
    [type, minutes, data.profile.weight]
  );

  return (
    <>
      <Card title="運動の追加">
        <div className="space-y-2">
          <select
            value={EX_TYPES.indexOf(type)}
            onChange={(e) => setType(EX_TYPES[Number(e.target.value)])}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            {EX_TYPES.map((t, i) => (
              <option key={i} value={i}>{t.label}</option>
            ))}
          </select>
          <label className="block text-xs text-[var(--ink-soft)]">
            時間 (分)
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </label>
          <div className="text-xs text-[var(--ink-soft)]">推定消費: {kcal} kcal</div>
          <button
            onClick={() => {
              onAdd({
                id: crypto.randomUUID(),
                dateISO: date,
                type: type.v,
                name: type.label,
                minutes,
                kcal,
              });
            }}
            className="w-full rounded-lg bg-[var(--primary)] py-2 text-sm font-semibold text-white"
          >
            追加する
          </button>
        </div>
      </Card>

      <Card title="今日の運動">
        {entries.length === 0 ? (
          <div className="py-3 text-center text-xs text-[var(--ink-soft)]">未記録</div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm">{e.name}</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">{e.minutes}分 / {e.kcal}kcal</div>
                </div>
                <button onClick={() => onRemove(e.id)} className="text-[var(--ink-soft)]">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function WeightTab({
  date,
  latest,
  onSave,
}: {
  date: string;
  latest?: WeightEntry;
  onSave: (w: WeightEntry) => void;
}) {
  const [w, setW] = useState(latest?.weight ?? 0);
  const [bf, setBf] = useState(latest?.bodyFat ?? 0);
  const [memo, setMemo] = useState(latest?.memo ?? "");

  return (
    <Card title="体重 / 体脂肪">
      <div className="space-y-2">
        <label className="block text-xs text-[var(--ink-soft)]">
          体重 (kg)
          <input
            type="number"
            step="0.1"
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-[var(--ink-soft)]">
          体脂肪率 (%)
          <input
            type="number"
            step="0.1"
            value={bf}
            onChange={(e) => setBf(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-[var(--ink-soft)]">
          メモ
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={() => onSave({ dateISO: date, weight: w, bodyFat: bf || undefined, memo })}
          disabled={!w}
          className="w-full rounded-lg bg-[var(--primary)] py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          保存する
        </button>
      </div>
    </Card>
  );
}
