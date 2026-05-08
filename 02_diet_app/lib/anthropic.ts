import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  fast: "claude-haiku-4-5",
  smart: "claude-sonnet-4-6",
} as const;

export function getClient(req: Request): Anthropic {
  const fromHeader = req.headers.get("x-anthropic-key");
  const apiKey = fromHeader || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が未設定です。環境変数か、設定画面でキーを入れてください。"
    );
  }
  return new Anthropic({ apiKey });
}

export function extractText(msg: Anthropic.Messages.Message): string {
  return msg.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export function extractJSON<T = unknown>(text: string): T | null {
  // Try fenced code block
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  // Find first { or [
  const start = candidate.search(/[{\[]/);
  if (start < 0) return null;
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export function errorJSON(e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : String(e);
  return Response.json({ error: msg }, { status });
}
