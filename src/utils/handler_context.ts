import {
  ApiActionHandlerContext,
  ApiBodyfullActionConfig,
  ApiResourceConfig,
  PathlessApiResourceConfig,
} from "../types.ts"

/**
 * @param req - Incoming request.
 * @param urlPatternResult - Resource url pattern result.
 * @param resourceConfig - Resource configuration.
 * @param actionConfig - Action configuration.
 * @returns An action handler context if successful, null if not.
 */
export async function createActionHandlerContext(
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

  const parsedHeaders = await actionConfig.headersSchema?.safeParseAsync(
    headers,
  )

  const parsedSearchParams = await actionConfig.searchParamsSchema
    ?.safeParseAsync(searchParams)

  const parsedUrlParams = await resourceConfig.urlParamsSchema?.safeParseAsync(
    urlParams,
  )

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
    urlParams: parsedUrlParams.data,
  } as ApiActionHandlerContext<
    // deno-lint-ignore no-explicit-any
    any,
    ApiResourceConfig<"/:param", PathlessApiResourceConfig<"/:param">>
  >
}
