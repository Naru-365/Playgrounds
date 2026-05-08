"use client";
import { shiftDate } from "@/lib/nutrition";

export default function DateBar({
  date,
  onChange,
}: {
  date: string;
  onChange: (d: string) => void;
}) {
  const d = new Date(date);
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        aria-label="前日"
        className="rounded-full p-2 text-[var(--ink-soft)] active:bg-[var(--line)]"
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="text-center">
        <div className="tabular text-base font-semibold">
          {d.getMonth() + 1}月{d.getDate()}日 ({dow})
        </div>
        <button
          onClick={() => onChange(today)}
          className="text-[10px] text-[var(--primary)]"
        >
          {date === today ? "今日" : "今日に戻す"}
        </button>
      </div>
      <button
        aria-label="翌日"
        className="rounded-full p-2 text-[var(--ink-soft)] active:bg-[var(--line)]"
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
