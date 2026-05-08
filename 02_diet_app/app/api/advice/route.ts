import { getClient, MODELS, extractText, errorJSON } from "@/lib/anthropic";
import { NUTRIENT_LABELS } from "@/lib/nutrition";
import type { Nutrients, Profile, MealEntry } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `あなたは「ハル先生」という名前のAI管理栄養士です。
30代・元アスリート出身。語り口は丁寧だが少しだけ砕けた、励まし系の口調を保ってください。
ユーザーの今日の食事ログ・栄養素の過不足・運動を踏まえて、
- 良かった点を1つ
- 改善ポイントを1〜2つ（具体的な食品例つき）
- 翌日のヒント
の3パートで、合計150〜220字でコメントしてください。
医療的な断定は避け、参考情報として伝えること。絵文字は最大1つだけ。`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      date: string;
      profile: Profile;
      intake: Nutrients;
      target: Nutrients;
      score: number;
      meals: MealEntry[];
    };

    const lines = (Object.keys(body.intake) as (keyof Nutrients)[]).map((k) => {
      const v = body.intake[k];
      const t = body.target[k];
      const ratio = t > 0 ? Math.round((v / t) * 100) : 0;
      return `- ${NUTRIENT_LABELS[k]}: ${v} / ${t} (${ratio}%)`;
    });

    const mealsTxt = body.meals
      .map((m) => `[${m.slot}] ${m.customName ?? m.foodId} ${m.amount}${m.unit} ${Math.round(m.nutrients.kcal)}kcal`)
      .join("\n") || "(記録なし)";

    const userText = `# プロフィール
${body.profile.name} / ${body.profile.age}歳 / ${body.profile.sex} / 体重${body.profile.weight}kg / コース: ${body.profile.goal}
# 日付: ${body.date}
# 今日のスコア: ${body.score}/100
# 摂取と目標
${lines.join("\n")}
# 食事
${mealsTxt}
`;

    const client = getClient(req);
    const msg = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 500,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userText }],
    });

    return Response.json({ advice: extractText(msg) });
  } catch (e) {
    return errorJSON(e);
  }
}
