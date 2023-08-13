import type {
  ApiActionConfig,
  ApiConfig,
  ApiMiddleware,
  ApiResourceConfig,
  Params,
  Path,
  PathlessApiResourceConfig,
} from "./types.ts"

export function zodApiMiddleware<const T extends ApiConfig>(
  apiConfig: T,
): ApiMiddleware<T> {
  return null as unknown as ApiMiddleware<T>
}

function parseParams<
  const T1 extends ApiActionConfig,
  const T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
>(req: Request): Params<T1, T2> {
  return null as unknown as Params<T1, T2>
}
