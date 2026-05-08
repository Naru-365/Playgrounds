"use client";
import type { WeightEntry } from "@/lib/types";

export default function WeightSpark({
  entries,
  target,
}: {
  entries: WeightEntry[];
  target?: number;
}) {
  const data = entries.slice(-30);
  if (data.length < 2) {
    return (
      <div className="grid h-24 place-items-center text-xs text-[var(--ink-soft)]">
        体重を記録するとグラフが表示されます
      </div>
    );
  }
  const w = 320;
  const h = 96;
  const pad = 8;
  const min = Math.min(...data.map((d) => d.weight), target ?? Infinity) - 1;
  const max = Math.max(...data.map((d) => d.weight), target ?? -Infinity) + 1;
  const span = Math.max(0.5, max - min);
  const xs = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const ys = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(d.weight).toFixed(1)}`)
    .join(" ");

  const area = `${path} L ${xs(data.length - 1).toFixed(1)} ${h - pad} L ${pad} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {target !== undefined && (
        <line
          x1={pad}
          x2={w - pad}
          y1={ys(target)}
          y2={ys(target)}
          stroke="var(--accent)"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
      )}
      <path d={area} fill="url(#g)" />
      <path d={path} stroke="var(--primary)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xs(i)} cy={ys(d.weight)} r={i === data.length - 1 ? 3 : 1.5} fill="var(--primary)" />
      ))}
    </svg>
  );
}
