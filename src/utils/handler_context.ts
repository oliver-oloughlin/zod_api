import {
  ApiActionHandlerContext,
  ApiBodyfullActionConfig,
  ApiResourceConfig,
  PathlessApiResourceConfig,
} from "../types.ts"

export async function createActionHandlerContext(
  req: Request,
  urlPatternResult: URLPatternResult,
  resourceConfig: ApiResourceConfig<
    "/:param",
    PathlessApiResourceConfig<"/:param">
  >,
  actionConfig: ApiBodyfullActionConfig,
) {
  const url = new URL(req.url)

  let body: unknown = undefined
  try {
    body = await req.json()
  } catch (_) {
    // Catch error
  }

  const headers = Object.fromEntries(req.headers.entries())
  const searchParams = Object.fromEntries(url.searchParams.entries())
  const urlParams = urlPatternResult.pathname.groups

  const parsedBody = await actionConfig.bodySchema?.safeParseAsync(body)

  const parsedHeaders = await actionConfig.headersSchema?.safeParseAsync(
    headers,
  )

  const parsedSearchParams = await actionConfig.searchParamsSchema
    ?.safeParseAsync(searchParams)

  const parsedUrlParams = await resourceConfig.urlParamsSchema?.safeParseAsync(
    urlParams,
  )

  if (
    (parsedBody && !parsedBody.success) ||
    (parsedHeaders && !parsedHeaders.success) ||
    (parsedSearchParams && !parsedSearchParams.success) ||
    (parsedUrlParams && !parsedUrlParams.success)
  ) {
    return null
  }

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
