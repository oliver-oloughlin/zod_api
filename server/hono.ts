import type {
  ApiActionMethod,
  ApiBodyfullActionConfig,
  ApiResourceConfig,
  PathlessApiResourceConfig,
} from "../src/types.ts"
import { type Env, Hono, type Schema } from "hono"
import { safeCoerceObject } from "./utils/zod.ts"
import { HonoApiServerConfig } from "./types.ts"
import { ApiServerHandlers } from "./types.ts"
import { ApiActionHandlerResult } from "./types.ts"
import { ApiActionHandlerContext } from "./types.ts"

export function hono<const T extends HonoApiServerConfig>(
  apiServerConfig: T,
  apiServerHandlers: ApiServerHandlers<T>,
): Hono<Env, Schema, "/"> {
  const app = new Hono()
  const handlerEntries = Object.entries(apiServerHandlers)

  handlerEntries.forEach(([resourceKey, resourceHandler]) => {
    const resourceConfig = apiServerConfig
      .resources[resourceKey] as ApiResourceConfig<
        "/:param",
        PathlessApiResourceConfig<"/:param">
      >

    if (!resourceConfig) {
      return
    }

    const actionEntries = Object.entries(resourceConfig.actions)
    actionEntries.forEach(([method, actionConfig]) => {
      const actionHandler = resourceHandler[method]
      const fn = app[method as ApiActionMethod]

      if (!actionHandler || !fn) {
        return
      }

      fn(resourceConfig.path, async (c) => {
        const headers = c.req.header()
        const searchParams = c.req.query()
        const urlParams = c.req.param()
        const body = await c.req.parseBody()

        const ctx = await createActionHandlerContext(
          headers,
          searchParams,
          urlParams,
          body,
          resourceConfig,
          actionConfig,
        )

        const res = actionHandler(c.req.raw, ctx) as ApiActionHandlerResult<any>

        if (res.ok) {
          const dataType = actionConfig.dataType ?? "JSON"
          const data = res.data

          if (data) {
            dataType === "JSON" ? c.json(data) : c.text(data)
          }

          const status = (res as any).status
          if (status) c.status(status)
        }
      })
    })
  })

  return app
}

/**
 * Create action handler context by parsing headers, search parameters, url parameters and body.
 *
 * @param headers
 * @param searchParams
 * @param urlParams
 * @param body
 * @param resourceConfig
 * @param actionConfig
 * @returns
 */
async function createActionHandlerContext(
  headers: unknown,
  searchParams: unknown,
  urlParams: unknown,
  body: unknown,
  resourceConfig: ApiResourceConfig<
    "/:param",
    PathlessApiResourceConfig<"/:param">
  >,
  actionConfig: ApiBodyfullActionConfig,
) {
  // Parse body, headers, search parameters and url parameters
  const parsedBody = await actionConfig.bodySchema?.safeParseAsync(body)

  const parsedHeaders = actionConfig.headersSchema
    // deno-lint-ignore no-explicit-any
    ? safeCoerceObject(headers, actionConfig.headersSchema as any)
    : null

  const parsedSearchParams = actionConfig.searchParamsSchema
    // deno-lint-ignore no-explicit-any
    ? safeCoerceObject(
      searchParams,
      actionConfig.searchParamsSchema as any,
    )
    : null

  const parsedUrlParams = resourceConfig.urlParamsSchema
    // deno-lint-ignore no-explicit-any
    ? safeCoerceObject(urlParams, resourceConfig.urlParamsSchema as any)
    : null

  // Check if failed to parse
  if (
    (parsedBody && !parsedBody.success) ||
    (parsedHeaders && !parsedHeaders.success) ||
    (parsedSearchParams && !parsedSearchParams.success) ||
    (parsedUrlParams && !parsedUrlParams.success)
  ) {
    return null
  }

  // Return action handler context
  return {
    body: parsedBody?.data,
    headers: parsedHeaders?.data,
    searchParams: parsedSearchParams?.data,
    urlParams: parsedUrlParams?.data,
  } as ApiActionHandlerContext<
    // deno-lint-ignore no-explicit-any
    any,
    ApiResourceConfig<"/:param", PathlessApiResourceConfig<"/:param">>
  >
}
