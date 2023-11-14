import { ApiServerConfig, ApiServerHandlers } from "./_types.ts"
import { routeRequest } from "./utils/router.ts"

export function serve<const T extends ApiServerConfig>(
  apiServerConfig: T,
  apiServerHandlers: ApiServerHandlers<T>,
) {
  return Deno.serve(apiServerConfig.options ?? {}, async (req) => {
    return await routeRequest(req, apiServerConfig, apiServerHandlers)
  })
}
