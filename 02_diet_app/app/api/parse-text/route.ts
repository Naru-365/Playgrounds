import { getClient, MODELS, extractText, extractJSON, errorJSON } from "@/lib/anthropic";

export const runtime = "nodejs";

const SYSTEM = `あなたは日本食を中心に栄養素を推定する専門家です。
ユーザーの自然文から食べた食品を抽出し、各品目について 100g 単位の標準値ではなく、
「実際に食べた量」に対する栄養素を推定してください。
出力は厳格な JSON のみ。コメントや前置きは禁止。
スキーマ:
{
  "items": [
    {
      "name": "string",         // 日本語の食品名 (例: 鮭おにぎり, 味噌汁)
      "amount_g": number,       // 推定摂取量(g)。個数で書かれていたら適切な平均グラム
      "kcal": number,
      "protein": number,        // g
      "fat": number,            // g
      "carb": number,           // g
      "fiber": number,          // g
      "salt": number,           // g
      "sugar": number,          // g (糖質)
      "calcium": number,        // mg
      "iron": number,           // mg
      "vitC": number            // mg
    }
  ]
}
推定が難しいフィールドは 0 にしてください。`;

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text?.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }
    const client = getClient(req);
    const msg = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: text }],
    });
    const out = extractJSON<{ items: unknown[] }>(extractText(msg));
    if (!out?.items) {
      return Response.json({ error: "AIの応答を解釈できませんでした", raw: extractText(msg) }, { status: 502 });
    }
    return Response.json(out);
  } catch (e) {
    return errorJSON(e);
  }
}
