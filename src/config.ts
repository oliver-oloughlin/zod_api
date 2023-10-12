import { ApiConfig } from "./types.ts"

export function zodApiConfig<const T extends ApiConfig>(config: T) {
  return config
}
