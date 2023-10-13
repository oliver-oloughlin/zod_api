import { ApiServerConfig, ApiServerHandlers } from "./types.ts"
import { routeRequest } from "./utils/router.ts"

export function server<const T extends ApiServerConfig>(
  apiServerConfig: T,
  apiServerHandlers: ApiServerHandlers<T>,
) {
  return Deno.serve(apiServerConfig.options ?? {}, async (req) => {
    return await routeRequest(req, apiServerConfig, apiServerHandlers)
  })
}
