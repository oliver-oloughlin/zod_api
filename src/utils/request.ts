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
import {
  createBody,
  createRequestParams,
  createUrl,
  parseParams,
} from "./request_params.ts"
import { sleep } from "./sleep.ts"
import {
  AUTHENTICATION_ERROR_STATUS_CODES,
  RETRYABLE_STATUS_CODES,
  ZodApiStatusCode,
} from "./status_codes.ts"

/**
 * Handles sending a request and parsing the result according to configurations.
 *
 * @param method
 * @param actionConfig
 * @param resourceConfig
 * @param apiClientConfig
 * @param params
 * @returns
 */
export async function handleRequest<const T extends ApiActionConfig>(
  method: ApiActionMethod,
  actionConfig: ApiActionConfig,
  resourceConfig: ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  apiClientConfig: ApiClientConfig<Fetcher>,
  params: PossibleApiClientActionParams | undefined,
): Promise<ApiResponse<T>> {
  try {
    // Parse parameters
    const parsedParams = parseParams(resourceConfig, actionConfig, params)

    // Create request init
    const url = createUrl(resourceConfig, apiClientConfig, parsedParams)

    const requestParams = createRequestParams(
      apiClientConfig,
      actionConfig,
      parsedParams,
    )

    const body = createBody(actionConfig, parsedParams)

    const requestInit = {
      ...requestParams,
      body,
      method,
    }

    // Set fetcher
    const fetcher = apiClientConfig.fetcher ?? fetch

    // Throttle request
    await apiClientConfig.throttle?.throttle()

    // Log request
    apiClientConfig.logger?.debug(`[${method}] ${url}`)

    // Send request
    const res = await sendRequest(
      url,
      requestInit,
      apiClientConfig,
      fetcher,
    )

    // Log response
    apiClientConfig.logger?.debug(
      `[${method}] ${res.status}${
        res.statusText ? ` ${res.statusText} ` : ""
      }${url}`,
    )

    if (!res.ok) {
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

    // Get data from response
    const data = actionConfig.dataType?.toLowerCase() === "text"
      ? await res.text()
      : await res.json()

    // Parse data
    const parsed = await actionConfig.dataSchema.safeParseAsync(data)

    // Handle failed parse
    if (!parsed.success) {
      // Log parse error
      apiClientConfig.logger?.error(parsed.error)

      // return response with custom error status
      return {
        ok: false,
        data: null,
        status: ZodApiStatusCode.DataParseError,
        statusText: "Data not parsed successfully",
        error: parsed.error,
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
      error: e,
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
async function sendRequest(
  url: string,
  init: RequestInit,
  apiClientConfig: ApiClientConfig<Fetcher>,
  fetcher: Fetcher,
) {
  // Create authentication headers
  let authHeaders = await apiClientConfig.auth?.createAuthHeaders()
  const retries = apiClientConfig.retry ?? [500, 1_000, 3_000]

  // Send request with auth headers
  let res = await fetcher(url, {
    ...init,
    headers: {
      ...init.headers,
      ...authHeaders,
    },
  })

  // If response indicates failed authentication, retry with refetch
  if (!res.ok && AUTHENTICATION_ERROR_STATUS_CODES.includes(res.status)) {
    authHeaders = await apiClientConfig.auth?.createAuthHeaders(true)

    res = await fetcher(url, {
      ...init,
      headers: {
        ...init.headers,
        ...authHeaders,
      },
    })
  }

  // Return if successful response
  if (res.ok) {
    return res
  }

  for (const timeout of retries) {
    // Send request with auth headers
    res = await fetcher(url, {
      ...init,
      headers: {
        ...init.headers,
        ...authHeaders,
      },
    })

    // Return if successful or not retryable
    if (!res.ok || !RETRYABLE_STATUS_CODES.includes(res.status)) {
      return res
    }

    // Wait before retrying
    await sleep(timeout)
  }

  // Return response
  return res
}
