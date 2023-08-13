import type { ApiConfig, ApiMiddleware } from "./types.ts"

export function zodApiMiddleware<const T extends ApiConfig>(
  apiConfig: T,
): ApiMiddleware<T> {
  return null as unknown as ApiMiddleware<T>
}
