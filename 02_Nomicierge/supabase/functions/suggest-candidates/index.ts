// Nomicierge — AI 候補提案 Edge Function
//
// 参加者の条件(responses + budget_votes)を集計し、Claude に Web 検索付きで
// 実在する店を3軒選ばせて candidates に保存、events.status を 'review' にする。
//
// デプロイ: ダッシュボード → Edge Functions → 新規作成 "suggest-candidates" に
// このファイルを貼り付け、「Verify JWT」を必ずオフにする。
// Secrets に ANTHROPIC_API_KEY を登録すること。詳細は ../README.md 参照。

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUDGET_ORDER = ["〜3,000円", "3,000〜5,000円", "5,000〜8,000円", "8,000円〜"];

type Candidate = {
  name: string;
  genre: string;
  area: string;
  budget_range: string;
  smoke: string;
  url: string;
  reason: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function buildSummary(
  responses: Array<Record<string, unknown>>,
  budgets: string[],
): string {
  const stations = responses
    .map((r) => `${r.from_type === "home" ? "自宅" : "職場"}最寄りの${r.station}駅`)
    .join("、");

  const genreCounts = new Map<string, number>();
  let anyGenre = 0;
  for (const r of responses) {
    if (r.any_genre) anyGenre++;
    for (const g of (r.genres as string[]) ?? []) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
  }
  const genreLine = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([g, n]) => `${g}(${n}票)`)
    .join("、") || "指定なし";

  const moods = responses.map((r) => r.mood).filter(Boolean).join("、") || "指定なし";
  const notes = responses
    .map((r) => (r.mood_note as string)?.trim())
    .filter(Boolean)
    .map((n) => `「${n}」`)
    .join("、") || "なし";

  const smokeCounts = new Map<string, number>();
  for (const r of responses) {
    if (r.smoke) smokeCounts.set(r.smoke as string, (smokeCounts.get(r.smoke as string) ?? 0) + 1);
  }
  const smokeLine = [...smokeCounts.entries()].map(([s, n]) => `${s}(${n}票)`).join("、") || "指定なし";

  const sorted = budgets
    .filter((b) => BUDGET_ORDER.includes(b))
    .sort((a, b) => BUDGET_ORDER.indexOf(a) - BUDGET_ORDER.indexOf(b));
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : "回答なし";
  const budgetDist = BUDGET_ORDER
    .map((b) => [b, budgets.filter((x) => x === b).length] as const)
    .filter(([, n]) => n > 0)
    .map(([b, n]) => `${b}(${n}票)`)
    .join("、") || "回答なし";

  return [
    `- 参加人数(回答済み): ${responses.length}名`,
    `- 出発駅: ${stations || "回答なし"}`,
    `- 食べたいジャンル: ${genreLine}${anyGenre ? `、なんでもOK(${anyGenre}票)` : ""}`,
    `- 希望する雰囲気: ${moods}`,
    `- 自由記入: ${notes}`,
    `- おたばこ: ${smokeLine}`,
    `- 予算(匿名集計): 中央値 ${median} / 分布 ${budgetDist}`,
  ].join("\n");
}

function extractCandidates(text: string): Candidate[] {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(raw);
  const list = parsed.candidates;
  if (!Array.isArray(list) || list.length !== 3) {
    throw new Error(`candidates は3件必要です(${Array.isArray(list) ? list.length : 0}件)`);
  }
  return list.map((c: Record<string, unknown>) => {
    for (const key of ["name", "url", "reason"]) {
      if (typeof c[key] !== "string" || !(c[key] as string).trim()) {
        throw new Error(`候補に ${key} がありません`);
      }
    }
    return {
      name: String(c.name),
      genre: String(c.genre ?? ""),
      area: String(c.area ?? ""),
      budget_range: String(c.budget_range ?? ""),
      smoke: String(c.smoke ?? ""),
      url: String(c.url),
      reason: String(c.reason),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "POST のみ受け付けます" });
  }

  let body: { organizer_token?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON ボディが必要です" });
  }
  if (!body.organizer_token) {
    return json(400, { error: "organizer_token が必要です" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 幹事トークンの照合(単一イベント運用なので token から event を引く)
  const { data: secret, error: secretErr } = await supabase
    .from("organizer_secrets")
    .select("event_id, token")
    .eq("token", body.organizer_token)
    .maybeSingle();
  if (secretErr) return json(500, { error: secretErr.message });
  if (!secret) return json(403, { error: "幹事トークンが正しくありません" });

  const eventId = secret.event_id;

  const [{ data: responses, error: rErr }, { data: budgetRows, error: bErr }] =
    await Promise.all([
      supabase.from("responses").select("*").eq("event_id", eventId),
      supabase.from("budget_votes").select("budget").eq("event_id", eventId),
    ]);
  if (rErr) return json(500, { error: rErr.message });
  if (bErr) return json(500, { error: bErr.message });
  if (!responses || responses.length === 0) {
    return json(400, { error: "まだ条件の回答がありません" });
  }

  const summary = buildSummary(responses, (budgetRows ?? []).map((b) => b.budget));

  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    timeout: 120_000,
  });

  const prompt = `あなたは飲み会コンシェルジュです。以下の参加者の条件サマリーに合う、実在する居酒屋・レストランを Web 検索で調べて3軒選んでください。

## 条件サマリー
${summary}

## ルール
- 参加者の出発駅から行きやすいエリア(共通の駅・沿線の乗換が少ない駅)で探すこと。
- **Web 検索の結果で実在を確認できた店だけ**を挙げること。検索でヒットしなかった店は絶対に出さない。
- 各店に食べログ・ホットペッパー・ぐるなび・公式サイトのいずれかの URL を必ず付けること(検索結果に出た実際の URL)。
- 全員の条件を1軒で満たせない場合は、3軒の組み合わせでバランスを取り、reason にその旨を書くこと。
- 予算の中央値に収まる店を優先すること。
- 喫煙希望と禁煙希望が混在する場合は、分煙や喫煙ブースのある店を検討すること。

## 出力形式
検討過程を簡潔に述べたあと、最後に次の JSON だけを \`\`\`json フェンスで出力してください:

\`\`\`json
{
  "candidates": [
    {
      "name": "店名",
      "genre": "ジャンル(例: 和食・居酒屋)",
      "area": "最寄り駅・エリア(例: 神田駅 徒歩3分)",
      "budget_range": "予算目安(例: 4,000〜5,000円)",
      "smoke": "喫煙可否(例: 全席禁煙・喫煙ブースあり)",
      "url": "参照URL",
      "reason": "この店を選んだ理由(参加者の条件との対応を具体的に)"
    }
  ]
}
\`\`\`

candidates は必ず3件にしてください。`;

  let message;
  try {
    const stream = anthropic.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 8,
          user_location: { type: "approximate", country: "JP", timezone: "Asia/Tokyo" },
        },
      ],
      messages: [{ role: "user", content: prompt }],
    });
    message = await stream.finalMessage();
  } catch (e) {
    return json(502, { error: `Claude API の呼び出しに失敗しました: ${(e as Error).message}` });
  }

  if (message.stop_reason === "refusal") {
    return json(502, { error: "Claude が回答を生成できませんでした。もう一度お試しください。" });
  }

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");

  let candidates: Candidate[];
  try {
    candidates = extractCandidates(text);
  } catch (e) {
    return json(502, {
      error: `候補の解析に失敗しました(${(e as Error).message})。「もう一度提案してもらう」を押してください。`,
    });
  }

  // 再生成に備えて既存の投票と候補を消してから入れ直す(votes → candidates の順)
  const { error: delVotesErr } = await supabase.from("votes").delete().eq("event_id", eventId);
  if (delVotesErr) return json(500, { error: delVotesErr.message });
  const { error: delCandErr } = await supabase.from("candidates").delete().eq("event_id", eventId);
  if (delCandErr) return json(500, { error: delCandErr.message });

  const { data: inserted, error: insErr } = await supabase
    .from("candidates")
    .insert(candidates.map((c, i) => ({ ...c, event_id: eventId, position: i + 1 })))
    .select();
  if (insErr) return json(500, { error: insErr.message });

  const { error: updErr } = await supabase
    .from("events")
    .update({ status: "review" })
    .eq("id", eventId);
  if (updErr) return json(500, { error: updErr.message });

  return json(200, { candidates: inserted });
});
