import { GoogleGenAI } from "@google/genai";

export const MODELS = {
  fast: "gemini-2.5-flash-lite",
  smart: "gemini-2.5-flash-lite",
} as const;

export function getClient(req: Request): GoogleGenAI {
  const fromHeader = req.headers.get("x-gemini-key");
  const apiKey = fromHeader || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が未設定です。環境変数か、設定画面でキーを入れてください。"
    );
  }
  return new GoogleGenAI({ apiKey });
}

export function extractJSON<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
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

export type ChatTurn = { role: "user" | "model"; text: string };

export async function generateText(
  ai: GoogleGenAI,
  opts: {
    model: string;
    system: string;
    user: string;
    maxOutputTokens?: number;
  }
): Promise<string> {
  const r = await ai.models.generateContent({
    model: opts.model,
    contents: opts.user,
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxOutputTokens ?? 800,
    },
  });
  return (r.text ?? "").trim();
}

export async function generateJSON<T = unknown>(
  ai: GoogleGenAI,
  opts: {
    model: string;
    system: string;
    user: string;
    maxOutputTokens?: number;
  }
): Promise<{ data: T | null; raw: string }> {
  const r = await ai.models.generateContent({
    model: opts.model,
    contents: opts.user,
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxOutputTokens ?? 2000,
      responseMimeType: "application/json",
    },
  });
  const raw = (r.text ?? "").trim();
  return { data: extractJSON<T>(raw), raw };
}

export async function generateJSONFromImage<T = unknown>(
  ai: GoogleGenAI,
  opts: {
    model: string;
    system: string;
    prompt: string;
    image: string;
    mimeType: string;
    maxOutputTokens?: number;
  }
): Promise<{ data: T | null; raw: string }> {
  const r = await ai.models.generateContent({
    model: opts.model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: opts.mimeType, data: opts.image } },
          { text: opts.prompt },
        ],
      },
    ],
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxOutputTokens ?? 2000,
      responseMimeType: "application/json",
    },
  });
  const raw = (r.text ?? "").trim();
  return { data: extractJSON<T>(raw), raw };
}

export async function generateChat(
  ai: GoogleGenAI,
  opts: {
    model: string;
    system: string;
    history: ChatTurn[];
    maxOutputTokens?: number;
  }
): Promise<string> {
  const r = await ai.models.generateContent({
    model: opts.model,
    contents: opts.history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxOutputTokens ?? 600,
    },
  });
  return (r.text ?? "").trim();
}
