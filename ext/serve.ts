import type {
  ApiActionMethod,
  ApiBodyfullActionConfig,
  ApiConfig,
  ApiResourceConfig,
  Logger,
  Path,
  PathlessApiResourceConfig,
} from "../mod.ts"
import type { TypeOf, ZodType } from "zod"
import { safeCoerceObject } from "https://deno.land/x/monoutils@v0.3.1/zod.ts"
import {
  badRequest,
  internalServerError,
  methodNotAllowed,
  notFound,
  ok,
} from "https://deno.land/x/monoutils@v0.3.1/response.ts"
import { parseConfig } from "../src/utils/parse_config.ts"

/*************/
/*           */
/*   TYPES   */
/*           */
/*************/

export type ApiServerConfig = ApiConfig & {
  logger?: Logger
  options?: Omit<Deno.ServeOptions, "onError">
  middleware?: Middleware
}

export type ApiServerHandlers<T extends ApiServerConfig> = {
  [K in keyof T["resources"]]: ApiServerResourceHandlers<T["resources"][K]>
}

export type ApiServerResourceHandlers<
  T extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> = {
  [K in keyof T["actions"]]: (
    req: Request,
    ctx: ApiActionHandlerContext<T["actions"][K], T>,
  ) =>
    | ApiActionHandlerResult<T["actions"][K]>
    | Promise<ApiActionHandlerResult<T["actions"][K]>>
}

export type ApiActionHandlerContext<T1, T2> =
  & (T1 extends { bodySchema: ZodType } ? { body: TypeOf<T1["bodySchema"]> }
    : Record<string, never>)
  & (T1 extends { searchParamsSchema: ZodType }
    ? { searchParams: TypeOf<T1["searchParamsSchema"]> }
    : Record<string, never>)
  & (T1 extends { headersSchema: ZodType }
    ? { headers: TypeOf<T1["headersSchema"]> }
    : Record<string, never>)
  & (T2 extends { urlParamsSchema: ZodType }
    ? { urlParams: TypeOf<T2["urlParamsSchema"]> }
    : Record<string, never>)

export type ApiActionHandlerResult<T> =
  | (T extends { dataSchema: ZodType } ? {
      ok: true
      data: TypeOf<T["dataSchema"]>
    }
    : {
      ok: true
      data?: never
    })
  | {
    ok: false
    status: number
    message?: string
  }

export type Middleware = (req: Request) => Response | Promise<Response> | void

export type PreparedResourceHandler = {
  resourceConfig: ApiResourceConfig<any, any>
  resourceHandlers: ApiServerResourceHandlers<any>
}

/************************/
/*                      */
/*   PUBLIC FUNCTIONS   */
/*                      */
/************************/

/**
 * Starts a HTTP server.
 *
 * @param apiServerConfig
 * @param apiServerHandlers
 * @returns
 */
export function serve<const T extends ApiServerConfig>(
  apiServerConfig: T,
  apiServerHandlers: ApiServerHandlers<T>,
) {
  return Deno.serve(apiServerConfig.options ?? {}, async (req) => {
    const res = await routeRequest(
      req,
      parseConfig(apiServerConfig),
      prepareResourceHandlers(apiServerConfig, apiServerHandlers),
    )

    apiServerConfig.logger?.debug(
      `[${req.method.toLowerCase()}] ${res.status}${
        res.statusText ? ` ${res.statusText} ` : " "
      }${new URL(req.url).pathname}`,
    )

    return res
  })
}

/*************************/
/*                       */
/*   PRIVATE FUNCTIONS   */
/*                       */
/*************************/

/**
 * @param req - Incoming request.
 * @param urlPatternResult - Resource url pattern result.
 * @param resourceConfig - Resource configuration.
 * @param actionConfig - Action configuration.
 * @returns An action handler context if successful, null if not.
 */
async function createActionHandlerContext(
  req: Request,
  urlPatternResult: URLPatternResult,
  resourceConfig: ApiResourceConfig<
    "/:param",
    PathlessApiResourceConfig<"/:param">
  >,
  actionConfig: ApiBodyfullActionConfig,
) {
  // Create URL from request url string
  const url = new URL(req.url)

  // Get body
  let body: unknown = undefined
  try {
    body = await req.json()
  } catch (_) {
    try {
      const formData = await req.formData()
      body = Object.fromEntries(formData.entries())
    } catch (_) {
      // Body type not supported
    }
  }

  // Get headers, search parameters and url parameters
  const headers = Object.fromEntries(req.headers.entries())
  const searchParams = Object.fromEntries(url.searchParams.entries())
  const urlParams = urlPatternResult.pathname.groups

  // Parse body, headers, search parameters and url parameters
  const parsedBody = await actionConfig.bodySchema?.safeParseAsync(body)

  const parsedHeaders = actionConfig.headersSchema
    // deno-lint-ignore no-explicit-any
    ? safeCoerceObject(headers, actionConfig.headersSchema as any)
    : null

  const parsedSearchParams = actionConfig.searchParamsSchema
    // deno-lint-ignore no-explicit-any
    ? safeCoerceObject(searchParams, actionConfig.searchParamsSchema as any)
    : null

  const parsedUrlParams = resourceConfig.urlParamsSchema
    // deno-lint-ignore no-explicit-any
    ? safeCoerceObject(urlParams, resourceConfig.urlParamsSchema as any)
    : null

  // Check for parse errors
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

function prepareResourceHandlers(
  apiServerConfig: ApiServerConfig,
  apiServerHandlers: ApiServerHandlers<any>,
): PreparedResourceHandler[] {
  return Object.entries(apiServerHandlers).map((
    [key, resourceHandlers],
  ) => ({
    resourceConfig: apiServerConfig.resources[key],
    resourceHandlers,
  }))
    .sort((r) => (r.resourceConfig as any).urlParamsSchema ? 1 : -1)
}

async function routeRequest(
  req: Request,
  apiServerConfig: ApiServerConfig,
  preparedResourceHandlers: PreparedResourceHandler[],
): Promise<Response> {
  try {
    // Get action method
    const method = req.method.toLowerCase() as ApiActionMethod

    // Run middleware and check for response
    const middleware = apiServerConfig.middleware
    if (middleware) {
      const res = await middleware(req)

      apiServerConfig.logger?.debug(
        `[${method}] Middleware${
          res ? ` ${res.status} ${res.statusText} ` : ""
        }${req.url}`,
      )

      if (res) {
        return res
      }
    }

    // Loop over resource handlers and execute url pattern to find match
    for (
      const { resourceConfig, resourceHandlers } of preparedResourceHandlers
    ) {
      const pattern = new URLPattern({ pathname: resourceConfig.path })
      const patternResult = pattern.exec(req.url)

      // Continue to next if no match
      if (!patternResult) {
        continue
      }

      // Get correct action handler, return method not allowed response if not set
      const actionHandler = resourceHandlers[method]
      if (!actionHandler) {
        return methodNotAllowed()
      }

      // Get accompanying action config
      const actionConfig = resourceConfig
        .actions[method] as ApiBodyfullActionConfig

      // Create action handler context
      const ctx = await createActionHandlerContext(
        req,
        patternResult,
        resourceConfig as ApiResourceConfig<
          "/:param",
          PathlessApiResourceConfig<"/:param">
        >,
        actionConfig,
      )

      // Return bad request response if context not set
      if (!ctx) {
        return badRequest()
      }

      // Run action handler
      const result = await actionHandler(
        req,
        ctx as ApiActionHandlerContext<unknown, unknown>,
      )

      // If result is ok, return successful response
      if (result.ok) {
        const dataType = actionConfig.dataType ?? "JSON"

        const data = dataType === "JSON"
          ? JSON.stringify(result.data)
          : `${result.data}`

        return ok(data)
      }

      // If result is not ok, return error response
      return new Response(result.message, {
        status: result.status,
      })
    }

    // If no matching resource handler is found, return not found response
    return notFound()
  } catch (e) {
    // Return internal error response upon catching an error
    apiServerConfig.logger?.error(e)
    return internalServerError()
  }
}
