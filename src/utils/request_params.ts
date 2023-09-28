import { TokenAuth } from "../TokenAuth.ts"
import type {
  ApiClientConfig,
  BodyType,
  Fetcher,
  PossibleApiClientActionParams,
} from "../types.ts"

export function urlWithParams(
  url: string,
  params?: PossibleApiClientActionParams,
) {
  // Get param entries
  const urlParamEntries = Object.entries(params?.urlParams ?? {})
  const searchParamEntries = Object.entries(params?.searchParams ?? {})

  // Create mutable url
  let mutableUrl = url

  // Add url parameters to URL
  for (const [param, value] of urlParamEntries) {
    mutableUrl = mutableUrl.replace(`:${param}`, `${value}`)
  }

  // Add search parameters to URL
  if (searchParamEntries.length > 0) {
    mutableUrl += "?"
    for (const [param, value] of searchParamEntries) {
      mutableUrl += `${param}=${value}&`
    }
    mutableUrl = mutableUrl.substring(0, mutableUrl.length - 1)
  }

  // Return modified url
  return mutableUrl
}

export function createRequestParams(
  apiConfig: ApiClientConfig<Fetcher>,
  params?: PossibleApiClientActionParams,
): RequestInit {
  // Stringify param headers
  const paramHeaderEntries = Object.entries(params?.headers ?? {})

  const stringifiedParamHeaderEntries = paramHeaderEntries.map((
    [key, value],
  ) => [key, `${value}`])

  const paramHeaders = Object.fromEntries(stringifiedParamHeaderEntries)

  // Merge in increasing priority
  return {
    ...apiConfig.requestParams,
    ...params?.requestParams,
    headers: {
      ...apiConfig.requestParams?.headers,
      ...paramHeaders,
    },
  }
}

export function createBody(
  bodyParams?: Record<string, unknown>,
  bodyType: BodyType = "JSON",
) {
  if (!bodyParams) {
    return undefined
  }

  if (bodyType === "JSON") {
    return JSON.stringify(bodyParams)
  }

  const urlSearchParams = new URLSearchParams()

  Object.entries(bodyParams).forEach(([key, value]) =>
    urlSearchParams.append(key, `${value}`)
  )

  return urlSearchParams
}

export async function createAuthHeaders(
  apiClientConfig: ApiClientConfig<Fetcher>,
): Promise<HeadersInit> {
  const auth = apiClientConfig.auth

  if (auth instanceof TokenAuth) {
    const bearer = await auth.createBearer()

    return bearer
      ? {
        Authorization: bearer,
      }
      : {}
  }

  return {}
}
