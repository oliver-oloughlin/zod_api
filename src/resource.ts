import type {
  ApiResourceConfig,
  Path,
  PathlessApiResourceConfig,
} from "./types.ts"

export function resource<
  const T1 extends Path,
  const T2 extends PathlessApiResourceConfig<T1>,
>(
  path: T1,
  config: T2,
) {
  return {
    path,
    ...config,
  } as ApiResourceConfig<T1, T2>
}
