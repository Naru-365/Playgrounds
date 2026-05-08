"use client";
import { useEffect, useRef, useState } from "react";
import { useAppData, useHydrated } from "@/lib/store";
import { dailyTotals, nutrientTarget, todayISO } from "@/lib/nutrition";
import type { ChatMessage } from "@/lib/types";

export default function TalkPage() {
  const hydrated = useHydrated();
  const { data, addChat, clearChat } = useAppData();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data.chat.length, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { role: "user", content: text, ts: new Date().toISOString() };
    addChat(userMsg);
    setInput("");
    setBusy(true);
    try {
      const today = todayISO();
      const totals = dailyTotals(data.meals, data.exercises, today);
      const target = nutrientTarget(data.profile);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(data.profile.apiKey ? { "x-anthropic-key": data.profile.apiKey } : {}),
        },
        body: JSON.stringify({
          profile: data.profile,
          history: [...data.chat, userMsg].slice(-12),
          context: { intake: totals.intake, target, burnedKcal: totals.burnedKcal, date: today },
        }),
      });
      const json = await res.json();
      const reply: ChatMessage = {
        role: "assistant",
        content: json.reply || json.error || "（応答が空でした）",
        ts: new Date().toISOString(),
      };
      addChat(reply);
    } catch (e) {
      addChat({ role: "assistant", content: `エラー: ${(e as Error).message}`, ts: new Date().toISOString() });
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return <div className="grid h-dvh place-items-center text-[var(--ink-soft)]">読み込み中…</div>;
  }

  return (
    <div className="flex h-[calc(100dvh-72px)] flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar />
          <div>
            <div className="text-sm font-semibold">ハル先生</div>
            <div className="text-[10px] text-[var(--primary)]">オンライン</div>
          </div>
        </div>
        <button onClick={() => confirm("履歴を消去しますか？") && clearChat()} className="text-xs text-[var(--ink-soft)]">
          履歴消去
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[var(--bg)] px-3 pb-3">
        {data.chat.length === 0 && (
          <div className="card mx-2 mt-3 p-3 text-[12px] text-[var(--ink-soft)]">
            何でも聞いてください。直近の食事ログと目標を見ながらお答えします。<br />
            例:「夜にプロテイン飲むのってアリ？」「最近脂質が多いかも」
          </div>
        )}
        {data.chat.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {busy && <Bubble m={{ role: "assistant", content: "…", ts: "" }} />}
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--surface)] p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="ハル先生に質問する"
          className="flex-1 rounded-full border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm"
          disabled={busy}
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="grid h-10 w-10 place-items-center rounded-full bg-[var(--primary)] text-white disabled:opacity-50"
          aria-label="送信"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="m4 12 16-8-6 18-3-7-7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && <Avatar />}
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-[var(--primary)] text-white"
            : "rounded-bl-sm bg-[var(--surface)] text-[var(--ink)]"
        }`}
      >
        <p className="whitespace-pre-wrap">{m.content}</p>
      </div>
    </div>
  );
}
