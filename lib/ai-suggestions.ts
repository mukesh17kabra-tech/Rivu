import { SUPPORTED_LANGUAGES } from "./review-suggestions";

/**
 * AI-written review suggestions.
 *
 * Two providers, both on free tiers, tried in order:
 *   1. Google Gemini Flash  (~15 requests/min, 1M tokens/day)
 *   2. Groq                 (~30 requests/min, no card required)
 *
 * Generation happens in the background when a store's pool runs low, never
 * in the path of a shopper waiting for suggestions — if both providers are
 * down or unconfigured the caller falls back to the hand-written templates
 * in review-suggestions.ts, so the feature degrades instead of breaking.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}

function languageName(code: string): string {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label.replace(/\s*\(.*\)$/, "") ??
    "English"
  );
}

function buildPrompt(params: {
  productTitle: string;
  rating: number;
  language: string;
  count: number;
}): string {
  const { productTitle, rating, language, count } = params;
  const tone =
    rating >= 5
      ? "delighted and enthusiastic"
      : rating === 4
        ? "positive with a small reservation"
        : rating === 3
          ? "neutral and even-handed"
          : rating === 2
            ? "disappointed but fair"
            : "clearly unhappy but not abusive";

  return [
    `Write ${count} different ${rating}-star customer review sentences for a product called "${productTitle}".`,
    `Tone: ${tone}.`,
    `Language: ${languageName(language)}. Write naturally in that language, do not translate literally.`,
    "",
    "Rules:",
    "- Each suggestion is 1-2 short sentences, the way a real shopper types.",
    "- Vary the wording, sentence shape and focus a lot. No two may feel like rewrites of each other.",
    "- Mention concrete things a buyer would notice (fit, quality, delivery, packaging, value, how it is used).",
    "- No names, no emoji, no hashtags, no quotation marks around the text.",
    "- Never invent specific discounts, prices or medical/health claims.",
    "",
    `Return ONLY a JSON array of exactly ${count} strings. No markdown, no commentary.`,
  ].join("\n");
}

/** Pulls a JSON string array out of a model response that may be fenced. */
function parseStringArray(raw: string): string[] {
  let text = raw.trim();

  // Strip ```json ... ``` fences if the model added them anyway.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();

  // Fall back to the outermost bracketed span.
  if (!text.startsWith("[")) {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return [];
    text = text.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter((s) => s.length > 8 && s.length < 400);
  } catch {
    return [];
  }
}

async function generateWithGemini(prompt: string): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0, // high, because variety is the whole point
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    console.error(`[ai-suggestions] gemini ${res.status}: ${await res.text().catch(() => "")}`);
    return [];
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseStringArray(text);
}

async function generateWithGroq(prompt: string): Promise<string[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return [];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 1.0,
      messages: [
        {
          role: "system",
          content:
            "You write short, natural product review sentences. You reply with a JSON array of strings and nothing else.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`[ai-suggestions] groq ${res.status}: ${await res.text().catch(() => "")}`);
    return [];
  }

  const data = await res.json();
  return parseStringArray(data?.choices?.[0]?.message?.content ?? "");
}

/**
 * Generates review suggestions, falling back from Gemini to Groq. Returns an
 * empty array rather than throwing when both are unavailable — the caller
 * treats that as "use the static templates this time".
 */
export async function generateSuggestions(params: {
  productTitle: string;
  rating: number;
  language: string;
  count: number;
}): Promise<string[]> {
  const prompt = buildPrompt(params);

  for (const [name, generate] of [
    ["gemini", generateWithGemini],
    ["groq", generateWithGroq],
  ] as const) {
    try {
      const results = await generate(prompt);
      if (results.length > 0) return results;
    } catch (err) {
      console.error(`[ai-suggestions] ${name} threw:`, err);
    }
  }

  return [];
}
