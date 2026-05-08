"use client";
import { useEffect, useState } from "react";

const HINT_KEY = "karute.iosHintDismissedAt";

export default function PWAInstaller() {
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignore registration errors in dev
      });
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari only
      window.navigator.standalone === true;
    if (!isIos || isStandalone) return;

    const dismissed = Number(localStorage.getItem(HINT_KEY) || 0);
    if (Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return;
    setShowIosHint(true);
  }, []);

  if (!showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-[460px] px-3">
      <div className="card flex items-start gap-3 p-3 shadow-lg">
        <span aria-hidden className="text-xl">📱</span>
        <div className="flex-1 text-[12px] leading-relaxed">
          <div className="font-semibold">ホーム画面に追加</div>
          <div className="text-[var(--ink-soft)]">
            画面下の <b>共有</b> →「<b>ホーム画面に追加</b>」でアプリのように使えます。
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(HINT_KEY, String(Date.now()));
            setShowIosHint(false);
          }}
          className="text-[var(--ink-soft)] active:opacity-60"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
