import { ApiConfig } from "./types.ts"

export function config<const T extends ApiConfig>(config: T) {
  return config
}
