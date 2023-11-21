import type {
  ApiBodyfullActionConfig,
  ApiClientConfig,
  ApiResourceConfig,
  Fetcher,
  Path,
  PathlessApiResourceConfig,
  PossibleApiClientActionParams,
} from "../types.ts"

export function parseParams(
  resourceConfig: ApiResourceConfig<any, any>,
  actionConfig: ApiBodyfullActionConfig,
  params: PossibleApiClientActionParams | undefined,
): PossibleApiClientActionParams {
  // Parse params using config schemas
  const urlParams = resourceConfig.urlParamsSchema
    ?.parse(params?.urlParams ?? {})

  const searchParams = actionConfig.searchParamsSchema
    ?.parse(params?.searchParams ?? {})

  const headers = actionConfig.headersSchema
    ?.parse(params?.headers ?? {})

  const body = actionConfig.bodySchema
    ?.parse(params?.body ?? {})

  // Create param entries
  const urlParamsEntry = urlParams
    ? {
      ...params?.urlParams,
      ...urlParams,
    }
    : undefined

  const searchParamsEntry = searchParams
    ? {
      ...params?.searchParams,
      ...searchParams,
    }
    : undefined

  const headersEntry = headers
    ? {
      ...params?.headers,
      ...headers,
    }
    : undefined

  const bodyEntry = body
    ? {
      ...params?.body,
      ...body,
    }
    : undefined

  // Return loose params + parsed params
  return {
    ...params,
    urlParams: urlParamsEntry,
    searchParams: searchParamsEntry,
    headers: headersEntry,
    body: bodyEntry,
  }
}

/**
 * Create a URL from base url, path and parameters
 *
 * @param resourceConfig
 * @param apiClientConfig
 * @param params
 * @returns
 */
export function createUrl(
  resourceConfig: ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  apiClientConfig: ApiClientConfig<Fetcher>,
  params: PossibleApiClientActionParams | undefined,
) {
  // Get param entries
  const urlParamEntries = Object.entries(params?.urlParams ?? {})
  const searchParamEntries = Object.entries(params?.searchParams ?? {})

  // Create mutable url
  let url = apiClientConfig.baseUrl + resourceConfig.path

  // Add url parameters to URL
  for (const [param, value] of urlParamEntries) {
    url = url.replace(`:${param}`, `${value}`)
    url = url.replace(`[${param}]`, `${value}`)
    url = url.replace(`{${param}}`, `${value}`)
  }

  // Add search parameters to URL
  if (searchParamEntries.length > 0) {
    url += "?"
    for (const [param, value] of searchParamEntries) {
      url += `${param}=${value}&`
    }
    url = url.substring(0, url.length - 1)
  }

  // Return modified url
  return url
}

/**
 * Create request parameters from api client config and action parameters
 *
 * @param apiConfig
 * @param params
 * @returns
 */
export function createRequestParams(
  apiClientConfig: ApiClientConfig<Fetcher>,
  actionConfig: ApiBodyfullActionConfig,
  params: PossibleApiClientActionParams | undefined,
): RequestInit {
  // Create param headers
  const paramHeaderEntries = Object.entries(params?.headers ?? {})

  const stringifiedParamHeaderEntries = paramHeaderEntries.map((
    [key, value],
  ) => [key, `${value}`])

  const paramHeaders = Object.fromEntries(stringifiedParamHeaderEntries)

  // Set content type header if request contains body
  const bodyType = actionConfig?.bodyType ?? "JSON"
  const contentType = bodyType === "JSON"
    ? "application/json"
    : "application/x-www-form-urlencoded"
  const contentTypeHeaderEntry = actionConfig.bodySchema
    ? {
      "Content-Type": contentType,
    }
    : undefined

  // Merge in increasing priority
  return {
    ...apiClientConfig.requestParams,
    ...params?.requestParams,
    headers: {
      ...contentTypeHeaderEntry,
      ...apiClientConfig.requestParams?.headers,
      ...paramHeaders,
    },
  }
}

/**
 * Create request body
 *
 * @param actionConfig
 * @param params
 * @returns
 */
export function createBody(
  actionConfig: ApiBodyfullActionConfig,
  params?: PossibleApiClientActionParams,
) {
  // If no body in params, return undefined
  const bodyParams = params?.body
  if (!bodyParams) {
    return undefined
  }

  // If body type is JSON, return stringified JSON
  const bodyType = actionConfig.bodyType ?? "JSON"
  if (bodyType === "JSON") {
    return JSON.stringify(bodyParams)
  }

  // Create URLSearchParameters and append body items
  const urlSearchParams = new URLSearchParams()

  Object.entries(bodyParams).forEach(([key, value]) =>
    urlSearchParams.append(key, `${value}`)
  )

  // Return URLSearchParameters body
  return urlSearchParams
}
