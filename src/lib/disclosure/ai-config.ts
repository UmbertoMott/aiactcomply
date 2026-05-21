// AI model config reader — never hardcode model names in components
// Priority: env var → package.json version field → safe fallback

export function getAIModelName(): string {
  return process.env.NEXT_PUBLIC_AI_MODEL_NAME ?? "Gemini 1.5 Pro";
}

export function getSystemVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
}

export function getPlatformName(): string {
  return "AIComply";
}
