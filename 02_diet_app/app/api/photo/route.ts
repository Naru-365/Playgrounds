import { getClient, MODELS, generateJSONFromImage, errorJSON } from "@/lib/llm";

export const runtime = "nodejs";

const SYSTEM = `あなたは料理写真から食品を識別し栄養素を推定する管理栄養士です。
写真に写っている料理ごとに「食品名」「推定量(g)」「主要な栄養素」を推定してください。
副菜まで分けて列挙し、見えない食品は無視してください。
出力は厳格な JSON のみ。コメントや前置きは禁止。
スキーマ:
{
  "items": [
    {
      "name": "string",
      "amount_g": number,
      "kcal": number,
      "protein": number,
      "fat": number,
      "carb": number,
      "fiber": number,
      "salt": number,
      "sugar": number,
      "calcium": number,
      "iron": number,
      "vitC": number,
      "confidence": number
    }
  ]
}`;

export async function POST(req: Request) {
  try {
    const { image, mediaType } = (await req.json()) as { image: string; mediaType: string };
    if (!image) {
      return Response.json({ error: "image is required" }, { status: 400 });
    }
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const mime = allowed.includes(mediaType) ? mediaType : "image/jpeg";

    const ai = getClient(req);
    const { data, raw } = await generateJSONFromImage<{ items: unknown[] }>(ai, {
      model: MODELS.smart,
      system: SYSTEM,
      prompt: "この写真の料理を識別し、上記スキーマで返してください。",
      image,
      mimeType: mime,
      maxOutputTokens: 1500,
    });
    if (!data?.items) {
      return Response.json({ error: "AIの応答を解釈できませんでした", raw }, { status: 502 });
    }
    return Response.json(data);
  } catch (e) {
    return errorJSON(e);
  }
}
