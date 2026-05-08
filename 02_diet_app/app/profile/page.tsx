"use client";
import { useState } from "react";
import Card from "@/components/Card";
import { useAppData, useHydrated } from "@/lib/store";
import { COURSE_LABEL, dailyKcalTarget, pfcTarget } from "@/lib/nutrition";
import type { ActivityLevel, GoalCourse, Sex } from "@/lib/types";

export default function ProfilePage() {
  const hydrated = useHydrated();
  const { data, updateProfile, exportJSON, importJSON } = useAppData();
  const [imported, setImported] = useState("");

  if (!hydrated) {
    return <div className="grid h-dvh place-items-center text-[var(--ink-soft)]">読み込み中…</div>;
  }

  const p = data.profile;
  const kcal = dailyKcalTarget(p);
  const pfc = pfcTarget(p);

  const onExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `karute-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <header className="px-4 pt-4">
        <h1 className="text-lg font-semibold">設定</h1>
      </header>

      <Card title="プロフィール">
        <div className="grid grid-cols-2 gap-3">
          <Field label="名前">
            <input
              value={p.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="年齢">
            <input
              type="number"
              value={p.age}
              onChange={(e) => updateProfile({ age: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="身長 (cm)">
            <input
              type="number"
              value={p.height}
              onChange={(e) => updateProfile({ height: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="体重 (kg)">
            <input
              type="number"
              step="0.1"
              value={p.weight}
              onChange={(e) => updateProfile({ weight: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="性別">
            <select
              value={p.sex}
              onChange={(e) => updateProfile({ sex: e.target.value as Sex })}
              className="input"
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </Field>
          <Field label="活動量">
            <select
              value={p.activity}
              onChange={(e) => updateProfile({ activity: e.target.value as ActivityLevel })}
              className="input"
            >
              <option value="low">低 (デスクワーク中心)</option>
              <option value="mid">中 (週2~3運動)</option>
              <option value="high">高 (週4~運動 / 立ち仕事)</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="目標">
        <div className="grid grid-cols-2 gap-3">
          <Field label="目標体重 (kg)">
            <input
              type="number"
              step="0.1"
              value={p.targetWeight ?? 0}
              onChange={(e) => updateProfile({ targetWeight: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="目標達成日">
            <input
              type="date"
              value={p.targetDate ?? ""}
              onChange={(e) => updateProfile({ targetDate: e.target.value })}
              className="input"
            />
          </Field>
        </div>
        <Field label="目的コース">
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {(Object.keys(COURSE_LABEL) as GoalCourse[]).map((g) => (
              <button
                key={g}
                onClick={() => updateProfile({ goal: g })}
                className={`rounded-lg border py-2 text-xs ${
                  p.goal === g
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--line)]"
                }`}
              >
                {COURSE_LABEL[g]}
              </button>
            ))}
          </div>
        </Field>
        <div className="mt-3 rounded-lg bg-[var(--bg)] p-3 text-[12px]">
          <div className="text-[var(--ink-soft)]">推奨摂取</div>
          <div className="tabular text-sm font-semibold">{kcal} kcal / 日</div>
          <div className="tabular text-[11px] text-[var(--ink-soft)]">
            P {pfc.protein}g · F {pfc.fat}g · C {pfc.carb}g
          </div>
        </div>
      </Card>

      <Card title="Gemini API キー (任意)">
        <p className="mb-2 text-[11px] text-[var(--ink-soft)]">
          サーバ側の環境変数 <code>GEMINI_API_KEY</code> を設定するのが推奨です。<br />
          ここに入れた場合、ヘッダー <code>x-gemini-key</code> でリクエストごとに渡します（端末ローカル保存）。
          キーは <a className="underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> で発行できます。
        </p>
        <input
          value={p.apiKey ?? ""}
          onChange={(e) => updateProfile({ apiKey: e.target.value })}
          placeholder="AIza..."
          type="password"
          className="input w-full"
        />
      </Card>

      <Card title="データ">
        <div className="flex gap-2">
          <button onClick={onExport} className="flex-1 rounded-lg border border-[var(--line)] py-2 text-sm">
            エクスポート
          </button>
          <label className="flex-1 cursor-pointer rounded-lg border border-[var(--line)] py-2 text-center text-sm">
            インポート
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const t = await f.text();
                try {
                  importJSON(t);
                  setImported("読み込みました");
                } catch (err) {
                  setImported(`失敗: ${(err as Error).message}`);
                }
              }}
            />
          </label>
        </div>
        {imported && <div className="mt-2 text-[11px] text-[var(--ink-soft)]">{imported}</div>}
      </Card>

      <div className="px-6 pb-12 pt-2 text-center text-[10px] text-[var(--ink-soft)]">
        Karute v0.1 — 個人利用専用 / データは端末ローカルに保存されます
      </div>

      <style jsx>{`
        .input {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
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
