import { TokenAuth } from "../TokenAuth.ts"
import type {
  ApiBodyfullActionConfig,
  ApiClientConfig,
  ApiResourceConfig,
  Fetcher,
  Path,
  PathlessApiResourceConfig,
  PossibleApiClientActionParams,
} from "../types.ts"

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
  params?: PossibleApiClientActionParams,
) {
  // Get param entries
  const urlParamEntries = Object.entries(params?.urlParams ?? {})
  const searchParamEntries = Object.entries(params?.searchParams ?? {})

  // Create mutable url
  let url = apiClientConfig.baseUrl + resourceConfig.path

  // Add url parameters to URL
  for (const [param, value] of urlParamEntries) {
    url = url.replace(`:${param}`, `${value}`)
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
  params?: PossibleApiClientActionParams,
): RequestInit {
  // Create param headers
  const paramHeaderEntries = Object.entries(params?.headers ?? {})

  const stringifiedParamHeaderEntries = paramHeaderEntries.map((
    [key, value],
  ) => [key, `${value}`])

  const paramHeaders = Object.fromEntries(stringifiedParamHeaderEntries)

  // Merge in increasing priority
  return {
    ...apiClientConfig.requestParams,
    ...params?.requestParams,
    headers: {
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

/**
 * Create authentication headers if auth is set
 *
 * @param apiClientConfig
 * @param refresh
 * @returns
 */
export async function createAuthHeaders(
  apiClientConfig: ApiClientConfig<Fetcher>,
  refresh = false,
): Promise<HeadersInit> {
  // Get auth option
  const auth = apiClientConfig.auth

  // Create token bearer headers if TokenAuth is set
  if (auth instanceof TokenAuth) {
    const bearer = await auth.createBearer(refresh)

    return bearer
      ? {
        Authorization: bearer,
      }
      : {}
  }

  // Return empty headers if no auth is set or matched
  return {}
}
