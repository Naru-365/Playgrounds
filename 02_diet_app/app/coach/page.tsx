"use client";
import { useMemo, useState } from "react";
import Card from "@/components/Card";
import { useAppData, useHydrated } from "@/lib/store";
import { sumNutrients, todayISO, weekStartISO } from "@/lib/nutrition";
import type { WorkoutPlan } from "@/lib/types";

const DOW = ["月", "火", "水", "木", "金", "土", "日"];

type Tab = "today" | "week" | "form";

type FormState = {
  goal: "bulk" | "cut" | "maintain";
  daysPerWeek: number;
  equipment: "bodyweight" | "dumbbell" | "gym";
  weakArea: string;
  injury: string;
  durationMin: number;
};

export default function CoachPage() {
  const hydrated = useHydrated();
  const { data, setPlan, logSet } = useAppData();
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    goal: data.profile.goal === "muscle" ? "bulk" : data.profile.goal === "diet" ? "cut" : "maintain",
    daysPerWeek: 4,
    equipment: "dumbbell",
    weakArea: "",
    injury: "",
    durationMin: 45,
  });

  const today = todayISO();
  const dayIndex = (new Date(today).getDay() + 6) % 7;
  const plan = data.plan;
  const planIsCurrent = plan && plan.weekStartISO === weekStartISO(today);

  const todayDay = useMemo(() => plan?.days.find((d) => d.dayIndex === dayIndex), [plan, dayIndex]);

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const recentMeals = data.meals.filter((m) => {
        const diff = (new Date(today).getTime() - new Date(m.dateISO).getTime()) / 86400000;
        return diff >= 0 && diff <= 7;
      });
      const recentAvg = sumNutrients(recentMeals.map((m) => m.nutrients));
      Object.keys(recentAvg).forEach((k) => {
        // average per day; if no days logged, divide by 1
        const days = Math.max(1, new Set(recentMeals.map((m) => m.dateISO)).size);
        // @ts-expect-error indexed
        recentAvg[k] = Number((recentAvg[k] / days).toFixed(1));
      });

      const res = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(data.profile.apiKey ? { "x-gemini-key": data.profile.apiKey } : {}),
        },
        body: JSON.stringify({
          profile: data.profile,
          form,
          recentAvg,
          weekStartISO: weekStartISO(today),
        }),
      });
      const json = (await res.json()) as { plan?: WorkoutPlan; error?: string };
      if (!json.plan) throw new Error(json.error || "プラン生成に失敗しました");
      setPlan(json.plan);
      setTab("today");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return <div className="grid h-dvh place-items-center text-[var(--ink-soft)]">読み込み中…</div>;
  }

  return (
    <div>
      <header className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-[var(--accent)]">Karute Coach</div>
            <h1 className="text-lg font-semibold">AI 筋トレプラン</h1>
          </div>
          {planIsCurrent && (
            <div className="text-[11px] text-[var(--ink-soft)]">
              今週: {plan!.weekStartISO}
            </div>
          )}
        </div>
      </header>

      <div className="mx-4 mt-3 grid grid-cols-3 rounded-full bg-[var(--line)] p-1 text-xs">
        {(["today", "week", "form"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full py-1.5 ${tab === t ? "bg-[var(--surface)] font-semibold" : "text-[var(--ink-soft)]"}`}
          >
            {t === "today" ? "今日" : t === "week" ? "週間" : "再生成"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-md bg-[var(--warn)]/10 px-3 py-2 text-xs text-[var(--warn)]">{error}</div>
      )}

      {!planIsCurrent && tab !== "form" && (
        <Card>
          <p className="text-sm text-[var(--ink-soft)]">
            まだ今週のプランがありません。「再生成」タブから生成してください。
          </p>
        </Card>
      )}

      {tab === "today" && planIsCurrent && (
        <>
          <Card title={`今日の${DOW[dayIndex]}曜・${todayDay?.focus ?? "休息日"}`}>
            {!todayDay || todayDay.items.length === 0 ? (
              <p className="text-sm text-[var(--ink-soft)]">今日は休息日です。栄養と睡眠を大事に。</p>
            ) : (
              <ul className="space-y-3">
                {todayDay.items.map((it, i) => {
                  const setsDone = data.planLogs.filter(
                    (l) => l.weekStartISO === plan!.weekStartISO && l.dayIndex === dayIndex && l.itemIndex === i
                  ).length;
                  return (
                    <li key={i} className="rounded-xl border border-[var(--line)] p-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-sm font-semibold">{it.name}</div>
                          <div className="text-[11px] text-[var(--ink-soft)]">
                            {it.sets}セット × {it.reps} {it.restSec ? `· 休憩${it.restSec}秒` : ""}
                          </div>
                        </div>
                        <div className="tabular text-xs text-[var(--ink-soft)]">{setsDone}/{it.sets}</div>
                      </div>
                      {it.note && <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{it.note}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.from({ length: it.sets }).map((_, si) => {
                          const done = si < setsDone;
                          return (
                            <button
                              key={si}
                              disabled={done}
                              onClick={() =>
                                logSet({
                                  weekStartISO: plan!.weekStartISO,
                                  dayIndex,
                                  itemIndex: i,
                                  setIndex: si,
                                  doneAt: new Date().toISOString(),
                                })
                              }
                              className={`tabular h-8 w-8 rounded-full border text-xs ${
                                done
                                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                  : "border-[var(--line)] bg-[var(--surface)]"
                              }`}
                            >
                              {si + 1}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="今週のメモ">
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--ink-soft)]">
              {plan!.notesFromAI}
            </p>
            <div className="mt-3 rounded-md bg-[var(--primary-soft)] px-3 py-2 text-xs text-[var(--primary)]">
              タンパク質目安: {plan!.proteinTargetG}g/日
            </div>
          </Card>
        </>
      )}

      {tab === "week" && planIsCurrent && (
        <Card title="週間サマリー">
          <ul className="divide-y divide-[var(--line)]">
            {Array.from({ length: 7 }).map((_, idx) => {
              const d = plan!.days.find((x) => x.dayIndex === idx);
              return (
                <li key={idx} className="flex items-start gap-3 py-2">
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      idx === dayIndex
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--bg)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {DOW[idx]}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{d?.focus ?? "休息"}</div>
                    {d && d.items.length > 0 && (
                      <div className="text-[11px] text-[var(--ink-soft)]">
                        {d.items.map((i) => i.name).join(" / ")}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {tab === "form" && (
        <Card title="プランの条件">
          <div className="space-y-3">
            <Field label="目的">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { v: "bulk", label: "増量" },
                    { v: "cut", label: "減量" },
                    { v: "maintain", label: "維持" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setForm({ ...form, goal: o.v })}
                    className={`rounded-lg border py-2 text-xs ${
                      form.goal === o.v
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--line)]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="週あたりの日数">
              <input
                type="number"
                min={2}
                max={6}
                value={form.daysPerWeek}
                onChange={(e) => setForm({ ...form, daysPerWeek: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </Field>

            <Field label="1回の時間 (分)">
              <input
                type="number"
                min={15}
                max={120}
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </Field>

            <Field label="設備">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { v: "bodyweight", label: "自重" },
                    { v: "dumbbell", label: "ダンベル" },
                    { v: "gym", label: "ジム" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setForm({ ...form, equipment: o.v })}
                    className={`rounded-lg border py-2 text-xs ${
                      form.equipment === o.v
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--line)]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="弱点 / 鍛えたい部位">
              <input
                value={form.weakArea}
                onChange={(e) => setForm({ ...form, weakArea: e.target.value })}
                placeholder="例: 背中・お尻"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </Field>

            <Field label="故障歴 / 注意点">
              <input
                value={form.injury}
                onChange={(e) => setForm({ ...form, injury: e.target.value })}
                placeholder="例: 左肩を上げると痛い"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </Field>

            <button
              onClick={generate}
              disabled={busy}
              className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "AIが組み立て中…" : "今週のプランを生成"}
            </button>
            <p className="text-[10px] text-[var(--ink-soft)]">
              直近の食事ログ平均と目的コースをコンテキストに含めて Claude に投げます。前週の達成率も自動で考慮します。
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-[var(--ink-soft)]">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
