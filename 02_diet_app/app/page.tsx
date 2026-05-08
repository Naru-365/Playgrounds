"use client";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import DateBar from "@/components/DateBar";
import NutritionRing from "@/components/NutritionRing";
import PFCBar from "@/components/PFCBar";
import NutrientList from "@/components/NutrientList";
import WeightSpark from "@/components/WeightSpark";
import { useAppData, useHydrated } from "@/lib/store";
import {
  COURSE_LABEL,
  dailyTotals,
  nutrientTarget,
  pfcTarget,
  score,
  todayISO,
} from "@/lib/nutrition";

export default function HomePage() {
  const hydrated = useHydrated();
  const { data } = useAppData();
  const [date, setDate] = useState(todayISO());
  const [advice, setAdvice] = useState<string>("");
  const [adviceLoading, setAdviceLoading] = useState(false);

  const target = useMemo(() => nutrientTarget(data.profile), [data.profile]);
  const pfc = useMemo(() => pfcTarget(data.profile), [data.profile]);
  const totals = useMemo(
    () => dailyTotals(data.meals, data.exercises, date),
    [data.meals, data.exercises, date]
  );
  const sc = useMemo(() => score(totals.intake, target), [totals.intake, target]);

  useEffect(() => {
    setAdvice("");
  }, [date]);

  const fetchAdvice = async () => {
    setAdviceLoading(true);
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(data.profile.apiKey ? { "x-gemini-key": data.profile.apiKey } : {}),
        },
        body: JSON.stringify({
          date,
          profile: data.profile,
          intake: totals.intake,
          target,
          score: sc,
          meals: data.meals.filter((m) => m.dateISO === date),
        }),
      });
      const json = await res.json();
      setAdvice(json.advice || json.error || "コメントを取得できませんでした");
    } catch (e) {
      setAdvice(`エラー: ${(e as Error).message}`);
    } finally {
      setAdviceLoading(false);
    }
  };

  if (!hydrated) {
    return <div className="grid h-dvh place-items-center text-[var(--ink-soft)]">読み込み中…</div>;
  }

  const recentWeights = data.weights.slice(-30);

  return (
    <div>
      <header className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-[var(--primary)]">
              {COURSE_LABEL[data.profile.goal]}コース
            </div>
            <h1 className="text-lg font-semibold">{data.profile.name}さんの今日</h1>
          </div>
          <div className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
            スコア {sc}
          </div>
        </div>
      </header>

      <DateBar date={date} onChange={setDate} />

      <Card>
        <div className="flex items-center justify-around">
          <NutritionRing
            current={totals.intake.kcal}
            target={target.kcal}
            label="摂取カロリー"
          />
          <div className="flex flex-col items-end gap-3 text-right">
            <div>
              <div className="text-[11px] text-[var(--ink-soft)]">運動</div>
              <div className="tabular text-lg font-semibold">−{Math.round(totals.burnedKcal)} kcal</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--ink-soft)]">純摂取</div>
              <div className="tabular text-lg font-semibold">
                {Math.round(totals.intake.kcal - totals.burnedKcal)} kcal
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="PFCバランス">
        <PFCBar
          protein={totals.intake.protein}
          fat={totals.intake.fat}
          carb={totals.intake.carb}
          targetProtein={pfc.protein}
          targetFat={pfc.fat}
          targetCarb={pfc.carb}
        />
      </Card>

      <Card
        title="ハル先生のひとこと"
        action={
          <button
            onClick={fetchAdvice}
            disabled={adviceLoading}
            className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {adviceLoading ? "考え中…" : advice ? "再生成" : "コメントをもらう"}
          </button>
        }
      >
        {advice ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--ink)]">{advice}</p>
        ) : (
          <p className="text-[12px] text-[var(--ink-soft)]">
            食事を入力したら「コメントをもらう」を押してください。AIが今日のバランスを見てアドバイスします。
          </p>
        )}
      </Card>

      <Card title="14栄養素のバランス">
        <NutrientList intake={totals.intake} target={target} />
      </Card>

      <Card title="体重の推移（直近30日）">
        <WeightSpark entries={recentWeights} target={data.profile.targetWeight} />
        <div className="mt-1 flex justify-between text-[11px] text-[var(--ink-soft)]">
          <span>
            最新: {recentWeights.at(-1)?.weight.toFixed(1) ?? "—"} kg
          </span>
          {data.profile.targetWeight && <span>目標: {data.profile.targetWeight} kg</span>}
        </div>
      </Card>
    </div>
  );
}
