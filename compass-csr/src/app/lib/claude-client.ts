// Thin wrapper around the Anthropic Messages API. In dev this hits Vite's
// proxy (see vite.config.ts); in production it hits the /api/anthropic
// serverless function (api/anthropic.js) — either way the key stays server-side.
// Must match the route the function is actually deployed at: a file at
// api/anthropic.js is served at exactly "/api/anthropic", not
// "/api/anthropic/v1/messages" (that nested path doesn't exist as a
// function in production and silently falls through to the SPA's
// catch-all rewrite, returning index.html instead of an API response).
export async function callClaude(system: string, userMessage: string, maxTokens: number): Promise<string> {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // errorData.error can be a plain string (our own serverless function's
    // error shape) or an object with a .message (Anthropic's API error shape)
    const message =
      typeof errorData?.error === "string" ? errorData.error : errorData?.error?.message;
    throw new Error(message ?? `API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText: string =
    data.content
      ?.filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("") ?? "";

  return rawText.trim();
}

export function stripCodeFences(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}
