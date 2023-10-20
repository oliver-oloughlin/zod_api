import type {
  ApiActionConfig,
  ApiActionMethod,
  ApiClientConfig,
  ApiResourceConfig,
  ApiResponse,
  Fetcher,
  Path,
  PathlessApiResourceConfig,
  PossibleApiClientActionParams,
} from "../types.ts"
import { createBody, createRequestParams, createUrl } from "./request_params.ts"
import {
  AUTHENTICATION_ERROR_STATUS_CODES,
  ZodApiStatusCode,
} from "./status_codes.ts"

/**
 * Send a request and parse the result according to configurations
 *
 * @param method
 * @param actionConfig
 * @param resourceConfig
 * @param apiClientConfig
 * @param params
 * @returns
 */
export async function sendRequest<const T extends ApiActionConfig>(
  method: ApiActionMethod,
  actionConfig: ApiActionConfig,
  resourceConfig: ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  apiClientConfig: ApiClientConfig<Fetcher>,
  params: PossibleApiClientActionParams | undefined,
): Promise<ApiResponse<T>> {
  try {
    // Create request init
    const url = createUrl(resourceConfig, apiClientConfig, params)
    const requestParams = createRequestParams(apiClientConfig, params)
    const body = createBody(actionConfig, params)

    const requestInit = {
      ...requestParams,
      body,
      method: method.toUpperCase(),
    }

    // Set fetcher
    const fetcher = apiClientConfig.fetcher ?? fetch

    // Throttle request
    await apiClientConfig.throttle?.throttle()

    // Log fetch event
    apiClientConfig.logger?.debug(`Fetching: ${url}`)

    // Send request with authentication
    const res = await sendAuthenticatedRequest(
      url,
      requestInit,
      apiClientConfig,
      fetcher,
    )

    if (!res.ok) {
      // Log HTTP error
      apiClientConfig.logger?.debug(
        `Error fetching: ${url}, Status: ${res.status} ${res.statusText}`,
      )

      // Return error response
      return {
        ok: false,
        data: null,
        status: res.status,
        statusText: res.statusText,
      }
    }

    // If no data schema, return successful response without data
    if (!actionConfig.dataSchema) {
      return {
        ok: true,
        data: null,
        status: res.status,
        statusText: res.statusText,
      }
    }

    // Get and parse data
    const dataType = actionConfig.dataType ?? "JSON"

    // Log data get event
    apiClientConfig.logger?.debug(`Getting data of type: ${dataType}`)

    // Get data from response
    const data = actionConfig.dataType?.toLowerCase() === "text"
      ? await res.text()
      : await res.json()

    // Log data parse event
    apiClientConfig.logger?.debug(`Parsing data of type: ${dataType}`)

    // Parse data
    const parsed = await actionConfig.dataSchema.safeParseAsync(data)

    // Handle failed parse
    if (!parsed.success) {
      // Log parse error
      apiClientConfig.logger?.debug(
        `Error when parsing data of type: ${dataType}
        ${JSON.stringify(parsed.error, null, 2)}`,
      )

      // return response with custom error status
      return {
        ok: false,
        data: null,
        status: ZodApiStatusCode.DataParseError,
        statusText: "Data not parsed successfully",
      }
    }

    // Return successful response with parsed data
    return {
      ok: true,
      data: parsed.data,
      status: res.status,
      statusText: res.statusText,
    }
  } catch (e) {
    // Log error
    apiClientConfig.logger?.error(e)

    // Return response with custom error status
    return {
      ok: false,
      data: null,
      status: ZodApiStatusCode.UncaughtClientError,
      statusText: "Unhandled client-side error",
    }
  }
}

/**
 * Send request with authentication and return raw response
 *
 * @param url
 * @param init
 * @param apiClientConfig
 * @param fetcher
 * @returns
 */
async function sendAuthenticatedRequest(
  url: string,
  init: RequestInit,
  apiClientConfig: ApiClientConfig<Fetcher>,
  fetcher: Fetcher,
) {
  // Create authentication headers
  const authHeaders = await apiClientConfig.auth?.createAuthHeaders()

  // Send request with auth headers
  const res = await fetcher(url, {
    ...init,
    headers: {
      ...init.headers,
      ...authHeaders,
    },
  })

  // If response indicates failed authentication, retry with refetch
  if (AUTHENTICATION_ERROR_STATUS_CODES.includes(res.status)) {
    const authHeaders = await apiClientConfig.auth?.createAuthHeaders(true)

    return await fetcher(url, {
      ...init,
      headers: {
        ...init.headers,
        ...authHeaders,
      },
    })
  }

  // Return response
  return res
}
