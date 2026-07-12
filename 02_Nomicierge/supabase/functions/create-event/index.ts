// Nomicierge — イベント作成 Edge Function
//
// create.html から呼ばれ、events を1件作成して幹事トークンを発行する。
// events への anon insert ポリシーを付けない設計のため、作成はこの関数
// (service role)経由のみ。organizer_secrets への insert と必ず一体で行う。
//
// デプロイ: ダッシュボード → Edge Functions → 新規作成 "create-event" に
// このファイルを貼り付け、「Verify JWT」を必ずオフにする。
// 必要な Secrets は SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY のみ
// (この2つは Supabase が自動注入するため通常は設定不要)。
// ANTHROPIC_API_KEY は不要(LLM 呼び出しはない)。詳細は ../../README.md 参照。

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NAME_MAX = 60;
const INFO_MAX = 200;
const COUNT_MIN = 2;
const COUNT_MAX = 50;
const RATE_LIMIT = 20; // 直近1時間の作成上限

type CreatePayload = {
  name?: unknown;
  event_date?: unknown;
  expected_count?: unknown;
  event_info?: unknown;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// "YYYY-MM-DD" 形式かつ実在する日付のときだけ受理する。それ以外は null 扱い。
function normalizeDate(value: unknown): string | null | "INVALID" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "INVALID";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "INVALID";
  const [, y, mo, d] = m;
  const dt = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return "INVALID";
  // 桁揃えの結果と再構成が一致するか(例: 2026-02-31 を弾く)
  if (
    dt.getUTCFullYear() !== Number(y) ||
    dt.getUTCMonth() + 1 !== Number(mo) ||
    dt.getUTCDate() !== Number(d)
  ) {
    return "INVALID";
  }
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "POST のみ受け付けます" });
  }

  let body: CreatePayload;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON ボディが必要です" });
  }

  // --- name(必須, trim 後 1〜60 文字) ---
  if (typeof body.name !== "string") {
    return json(400, { error: "飲み会名を入力してください。" });
  }
  const name = body.name.trim();
  if (name.length < 1) {
    return json(400, { error: "飲み会名を入力してください。" });
  }
  if (name.length > NAME_MAX) {
    return json(400, { error: `飲み会名は${NAME_MAX}文字以内で入力してください。` });
  }

  // --- event_date(任意, 妥当な YYYY-MM-DD のみ) ---
  const eventDate = normalizeDate(body.event_date);
  if (eventDate === "INVALID") {
    return json(400, { error: "開催日の形式が正しくありません。" });
  }

  // --- expected_count(任意, 2〜50 の整数) ---
  let expectedCount: number | null = null;
  const rawCount = body.expected_count;
  if (rawCount !== null && rawCount !== undefined && rawCount !== "") {
    const n = typeof rawCount === "string" ? Number(rawCount) : rawCount;
    if (typeof n !== "number" || !Number.isInteger(n)) {
      return json(400, { error: "想定人数は整数で入力してください。" });
    }
    if (n < COUNT_MIN || n > COUNT_MAX) {
      return json(400, { error: `想定人数は${COUNT_MIN}〜${COUNT_MAX}人で入力してください。` });
    }
    expectedCount = n;
  }

  // --- event_info(任意, 200 文字以内) ---
  let eventInfo: string | null = null;
  if (body.event_info !== null && body.event_info !== undefined && body.event_info !== "") {
    if (typeof body.event_info !== "string") {
      return json(400, { error: "イベント情報の形式が正しくありません。" });
    }
    const info = body.event_info.trim();
    if (info.length > INFO_MAX) {
      return json(400, { error: `イベント情報は${INFO_MAX}文字以内で入力してください。` });
    }
    eventInfo = info.length ? info : null;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // --- 簡易アビューズ対策: 直近1時間の作成件数 ---
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneHourAgo);
  if (countErr) return json(500, { error: countErr.message });
  if ((count ?? 0) > RATE_LIMIT) {
    return json(429, { error: "作成が集中しています。しばらくしてからお試しください。" });
  }

  // --- events を作成 ---
  const { data: event, error: insErr } = await supabase
    .from("events")
    .insert({
      name,
      event_date: eventDate,
      expected_count: expectedCount,
      event_info: eventInfo,
      status: "collecting",
    })
    .select("id")
    .single();
  if (insErr) return json(500, { error: insErr.message });

  // --- 幹事トークンを発行して organizer_secrets に保存 ---
  const token = crypto.randomUUID().replaceAll("-", ""); // 32 hex
  const { error: secretErr } = await supabase
    .from("organizer_secrets")
    .insert({ event_id: event.id, token });
  if (secretErr) {
    // 孤児イベント防止: 作成した events 行を削除してから 500 を返す
    await supabase.from("events").delete().eq("id", event.id);
    return json(500, { error: secretErr.message });
  }

  return json(200, { event_id: event.id, organizer_token: token });
});
