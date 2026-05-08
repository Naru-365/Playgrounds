"use client";
import {
  NUTRIENT_KEYS,
  NUTRIENT_LABELS,
  NUTRIENT_UNITS,
  isUpperBound,
  nutrientStatus,
} from "@/lib/nutrition";
import type { Nutrients } from "@/lib/types";

const STATUS_COLOR = {
  low: "var(--caution)",
  ok: "var(--good)",
  high: "var(--warn)",
} as const;

const STATUS_LABEL = { low: "不足", ok: "適切", high: "過剰" } as const;

export default function NutrientList({
  intake,
  target,
}: {
  intake: Nutrients;
  target: Nutrients;
}) {
  return (
    <ul className="divide-y divide-[var(--line)]">
      {NUTRIENT_KEYS.filter((k) => k !== "kcal").map((k) => {
        const v = intake[k] || 0;
        const t = target[k] || 0;
        const upper = isUpperBound(k);
        const status = nutrientStatus(v, t, upper);
        const ratio = t > 0 ? Math.min(1.4, v / t) : 0;
        const fillW = `${Math.min(100, ratio * 100 * (upper ? 1 : 1))}%`;
        return (
          <li key={k} className="flex items-center gap-3 py-2.5">
            <div className="w-24 shrink-0 text-sm">{NUTRIENT_LABELS[k]}</div>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: fillW, background: STATUS_COLOR[status] }}
                />
              </div>
            </div>
            <div className="tabular w-24 shrink-0 text-right text-xs text-[var(--ink-soft)]">
              {v.toFixed(1)}
              <span className="opacity-60"> /{t.toFixed(0)}{NUTRIENT_UNITS[k]}</span>
            </div>
            <div
              className="w-10 shrink-0 text-center text-[10px] font-semibold"
              style={{ color: STATUS_COLOR[status] }}
            >
              {STATUS_LABEL[status]}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
