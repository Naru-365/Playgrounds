"use client";

type Props = {
  protein: number;
  fat: number;
  carb: number;
  targetProtein?: number;
  targetFat?: number;
  targetCarb?: number;
};

export default function PFCBar({
  protein,
  fat,
  carb,
  targetProtein,
  targetFat,
  targetCarb,
}: Props) {
  const total = protein * 4 + fat * 9 + carb * 4 || 1;
  const pp = (protein * 4) / total;
  const fp = (fat * 9) / total;
  const cp = (carb * 4) / total;

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full bg-[var(--primary)]" style={{ width: `${pp * 100}%` }} />
        <div className="h-full bg-[var(--accent)]" style={{ width: `${fp * 100}%` }} />
        <div className="h-full bg-[var(--caution)]" style={{ width: `${cp * 100}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <Cell color="var(--primary)" label="P" v={protein} t={targetProtein} />
        <Cell color="var(--accent)" label="F" v={fat} t={targetFat} />
        <Cell color="var(--caution)" label="C" v={carb} t={targetCarb} />
      </div>
    </div>
  );
}

function Cell({
  color,
  label,
  v,
  t,
}: {
  color: string;
  label: string;
  v: number;
  t?: number;
}) {
  return (
    <div className="rounded-md bg-[var(--bg)] px-2 py-1 text-center">
      <div className="flex items-center justify-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="font-medium text-[var(--ink-soft)]">{label}</span>
      </div>
      <div className="tabular text-sm font-semibold">
        {Math.round(v)}
        {t ? <span className="text-[var(--ink-soft)] font-normal"> /{t}</span> : null}
        <span className="text-[10px] text-[var(--ink-soft)]"> g</span>
      </div>
    </div>
  );
}
