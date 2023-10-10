import { ApiServerConfig, ApiServerHandlers } from "./types.ts"

export function zodApiServer<const T extends ApiServerConfig>(
  config: T,
  handlers: ApiServerHandlers<T>,
) {
  return Deno.serve(config.options ?? {}, async (req) => {
    return new Response()
  })
}
