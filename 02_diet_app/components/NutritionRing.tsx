"use client";

type Props = {
  current: number;
  target: number;
  label?: string;
  unit?: string;
  size?: number;
};

export default function NutritionRing({
  current,
  target,
  label = "摂取",
  unit = "kcal",
  size = 180,
}: Props) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = target > 0 ? Math.min(1.2, current / target) : 0;
  const dash = c * Math.min(1, ratio);

  const remaining = Math.max(0, target - current);
  const over = current > target;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--line)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? "var(--warn)" : "var(--primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          fill="none"
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xs text-[var(--ink-soft)]">{label}</div>
          <div className="tabular text-3xl font-semibold leading-tight">
            {Math.round(current)}
          </div>
          <div className="tabular text-xs text-[var(--ink-soft)]">
            / {Math.round(target)} {unit}
          </div>
          <div className="mt-1 text-[11px] text-[var(--ink-soft)]">
            {over ? `+${Math.round(current - target)} オーバー` : `あと ${Math.round(remaining)}`}
          </div>
        </div>
      </div>
    </div>
  );
}
