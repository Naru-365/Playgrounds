import { getClient, MODELS, generateChat, errorJSON, type ChatTurn } from "@/lib/llm";
import { NUTRIENT_LABELS } from "@/lib/nutrition";
import type { ChatMessage, Nutrients, Profile } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_BASE = `あなたは「ハル先生」というAI管理栄養士兼コーチです。
- 30代・元アスリート出身、丁寧だが少しだけ砕けた口調
- 1〜3行の短い返答を基本とし、必要なときだけ箇条書き
- 医療診断は避け、参考情報として伝える
- ユーザーの直近の食事/運動コンテキストを使い、可能な限り具体的・実行可能な提案をする
- 過度な励ましや断言は避ける`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      profile: Profile;
      history: ChatMessage[];
      context: { intake: Nutrients; target: Nutrients; burnedKcal: number; date: string };
    };

    const intakeLines = (Object.keys(body.context.intake) as (keyof Nutrients)[]).map((k) => {
      const v = body.context.intake[k];
      const t = body.context.target[k];
      const ratio = t > 0 ? Math.round((v / t) * 100) : 0;
      return `${NUTRIENT_LABELS[k]}: ${v}/${t}(${ratio}%)`;
    });

    const ctx = `[ユーザー情報] ${body.profile.name}/${body.profile.age}歳/${body.profile.sex}/体重${body.profile.weight}kg/コース:${body.profile.goal}
[今日の摂取] ${intakeLines.join(" / ")}
[運動による消費] ${body.context.burnedKcal}kcal
※ ユーザーには上記コンテキストが見えていないので、必要に応じて自然に引用して構いません。`;

    const system = `${SYSTEM_BASE}\n\n${ctx}`;
    const turns: ChatTurn[] = body.history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      text: m.content,
    }));

    const ai = getClient(req);
    const reply = await generateChat(ai, {
      model: MODELS.fast,
      system,
      history: turns,
      maxOutputTokens: 600,
    });
    return Response.json({ reply });
  } catch (e) {
    return errorJSON(e);
  }
}
