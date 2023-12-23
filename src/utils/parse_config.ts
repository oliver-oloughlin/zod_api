import type { ApiConfig, ApiResourceRecord } from "../types.ts"

export function parseConfig<const T extends ApiConfig>(config: ApiConfig): T {
  return {
    ...config,
    resoruces: parseResources(config.resources),
  } as unknown as T
}

function parseResources<const T extends ApiResourceRecord>(resources: T): T {
  const paths = new Set<string>()

  const entries = Object.entries(resources).map(
    ([key, resourceConfig]) => {
      const path = resourceConfig.path
      if (paths.has(path)) {
        throw new Error(`Duplicate path detected: ${path}`)
      }

      paths.add(path)
      return [key, resourceConfig] as const
    },
  )

  return Object.fromEntries(entries) as T
}
