"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/log", label: "記録", icon: "log" },
  { href: "/coach", label: "プラン", icon: "coach" },
  { href: "/talk", label: "ハル", icon: "talk" },
  { href: "/profile", label: "設定", icon: "profile" },
];

const ICONS: Record<string, React.ReactElement> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M3.5 11 12 4l8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-7v6H5a1.5 1.5 0 0 1-1.5-1.5V11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  log: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M5 4h11l3 3v13H5V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8 11h8M8 15h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  coach: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M5 9h2l1-1 8 8-1 1H13l-8-8Zm14 6 1 1m-2-4 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6.5" cy="17.5" r="2" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  talk: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M5 5h14v10H9l-4 4V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
      <ul className="grid grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] transition ${
                  active ? "text-[var(--primary)]" : "text-[var(--ink-soft)]"
                }`}
              >
                {ICONS[it.icon]}
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
