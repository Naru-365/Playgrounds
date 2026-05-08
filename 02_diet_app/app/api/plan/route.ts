import { getClient, MODELS, extractText, extractJSON, errorJSON } from "@/lib/anthropic";
import type { Profile, Nutrients, WorkoutPlan } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `あなたは「ハル先生」という名前のAIパーソナルコーチで、運動生理学と栄養の知識を持っています。
ユーザーの目的・設備・所要時間・故障歴を踏まえて、安全で再現性の高い1週間分の筋トレ/有酸素プランを設計してください。
- 同じ部位を連続で追い込まない（48時間以上空ける）
- 設備に存在しない器具は使わない
- 故障歴に該当する種目は避け、代替を選ぶ
- 1日あたりの所要時間を超えないように種目数を調整
- 直近の食事ログ平均から、タンパク質が体重×1.6g/日に届いていない場合は強度を一段階下げ、補食を提案する
出力は厳格な JSON のみ。コメントや前置きは禁止。
スキーマ:
{
  "weekStartISO": "YYYY-MM-DD",
  "proteinTargetG": number,
  "notesFromAI": "string",   // 今週のメモ・補食提案・注意点 (300字以内)
  "days": [
    {
      "dayIndex": number,    // 0=月, 6=日
      "focus": "string",     // 例: 上半身プッシュ / 下半身 / 休息 / 有酸素 など
      "items": [
        {
          "name": "string",
          "sets": number,
          "reps": "string",   // "8-10" のような幅もOK
          "restSec": number,
          "note": "string"
        }
      ]
    }
  ]
}
休息日は items を空配列、focus を "休息" にしてください。dayIndex は 0..6 全て埋めること。`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      profile: Profile;
      form: {
        goal: "bulk" | "cut" | "maintain";
        daysPerWeek: number;
        equipment: "bodyweight" | "dumbbell" | "gym";
        weakArea?: string;
        injury?: string;
        durationMin: number;
      };
      recentAvg: Partial<Nutrients>;
      weekStartISO: string;
    };

    const userText = `# プロフィール
${body.profile.name} / ${body.profile.age}歳 / ${body.profile.sex} / 身長${body.profile.height}cm / 体重${body.profile.weight}kg / コース: ${body.profile.goal}
# プラン要件
- 目的: ${body.form.goal} (bulk=増量 / cut=減量 / maintain=維持)
- 週あたり日数: ${body.form.daysPerWeek}
- 1回の所要時間: ${body.form.durationMin}分
- 設備: ${body.form.equipment}
- 弱点・鍛えたい部位: ${body.form.weakArea || "(指定なし)"}
- 故障歴・注意: ${body.form.injury || "(なし)"}
# 直近7日間の摂取平均
- kcal: ${body.recentAvg.kcal ?? 0}
- protein: ${body.recentAvg.protein ?? 0}g
- fat: ${body.recentAvg.fat ?? 0}g
- carb: ${body.recentAvg.carb ?? 0}g
# 今週の開始日 (月曜)
${body.weekStartISO}
`;

    const client = getClient(req);
    const msg = await client.messages.create({
      model: MODELS.smart,
      max_tokens: 4000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userText }],
    });

    const plan = extractJSON<WorkoutPlan>(extractText(msg));
    if (!plan?.days) {
      return Response.json({ error: "AIの応答を解釈できませんでした", raw: extractText(msg) }, { status: 502 });
    }
    plan.weekStartISO = body.weekStartISO;
    return Response.json({ plan });
  } catch (e) {
    return errorJSON(e);
  }
}
