import { StatusCode } from "./status_codes.ts"
import type {
  ApiActionConfig,
  ApiClient,
  ApiClientAction,
  ApiClientActions,
  ApiConfig,
  ApiGetActionConfig,
  ApiPostActionConfig,
  ApiResourceConfig,
  ApiResponse,
  BodyType,
  Params,
  ParamsSchema,
  Path,
  PathlessApiResourceConfig,
  WithURLParamsSchema,
} from "./types.ts"

/* == API CREATION FUNCTIONS == */

export function zodApiClient<const T extends ApiConfig>(
  config: T,
): ApiClient<T> {
  const apiClient = Object.fromEntries(
    Object.entries(config.resources).map(([key, resourceConfig]) => [
      key,
      createApiClientActions(resourceConfig, config),
    ]),
  )

  return apiClient as ApiClient<T>
}

export function zodApiResource<
  const T1 extends Path,
  const T2 extends PathlessApiResourceConfig<T1>,
  const T3 extends ApiResourceConfig<T1, T2> = ApiResourceConfig<T1, T2>,
>(
  path: T1,
  config: T2,
) {
  return {
    path,
    ...config,
  } as T3
}

function createApiClientActions<
  const T extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
>(
  resourceConfig: T,
  apiConfig: ApiConfig,
): ApiClientActions<T["actions"], T> {
  const actions = Object.fromEntries(
    Object.entries(resourceConfig.actions)
      .map(([key, actionConfig]) => [
        key,
        key === "get"
          ? createClientGetAction(
            actionConfig as ApiGetActionConfig,
            resourceConfig,
            apiConfig,
          )
          : key === "post"
          ? createClientPostAction(
            actionConfig as ApiPostActionConfig,
            resourceConfig,
            apiConfig,
          )
          : null,
      ])
      .filter(([_, action]) => !!action),
  )

  return actions as ApiClientActions<T["actions"], T>
}

function createClientGetAction<
  const T1 extends ApiGetActionConfig,
  const T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
>(
  actionConfig: T1,
  resourceConfig: T2,
  apiConfig: ApiConfig,
): ApiClientAction<T1, T2> {
  // Collect resource objects/options
  const url = apiConfig.baseUrl + resourceConfig.path
  const withUrlParamsSchema = resourceConfig as unknown as WithURLParamsSchema

  // If resource takes no parameters, create a simple GET handler
  if (
    typeof actionConfig.searchParamsSchema === "undefined" &&
    typeof withUrlParamsSchema.urlParamsSchema === "undefined" &&
    typeof actionConfig.headersSchema === "undefined"
  ) {
    return (options?: RequestInit) =>
      sendRequest(url, "GET", actionConfig, apiConfig, {
        ...options,
        headers: {
          ...apiConfig.defaultHeaders,
          ...options?.headers,
        },
      })
  }

  // Create handler function
  const handler: (
    params?: Params<T1, T2>,
    options?: RequestInit,
  ) => Promise<ApiResponse<T1>> = (params, options) => {
    return sendRequest(
      urlWithParams(url, actionConfig, resourceConfig, params),
      "GET",
      actionConfig,
      apiConfig,
      {
        ...options,
        headers: createActionHeaders(
          actionConfig,
          resourceConfig,
          apiConfig,
          params,
          options,
        ),
      },
    )
  }

  return handler as ApiClientAction<T1, T2>
}

function createClientPostAction<
  const T1 extends ApiPostActionConfig,
  const T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
>(
  actionConfig: T1,
  resourceConfig: T2,
  apiConfig: ApiConfig,
): ApiClientAction<T1, T2> {
  // Collect resource objects/options
  const url = apiConfig.baseUrl + resourceConfig.path
  const withUrlParamsSchema = resourceConfig as unknown as WithURLParamsSchema

  // If resource takes no parameters, create a simple POST handler
  if (
    typeof actionConfig.searchParamsSchema === "undefined" &&
    typeof withUrlParamsSchema.urlParamsSchema === "undefined" &&
    typeof actionConfig.headersSchema === "undefined" &&
    typeof actionConfig.bodySchema === "undefined"
  ) {
    return (options?: RequestInit) =>
      sendRequest(url, "POST", actionConfig, apiConfig, {
        ...options,
        headers: {
          ...apiConfig.defaultHeaders,
          ...options?.headers,
        },
      })
  }

  // Create handler function
  const handler: (
    params?: Params<T1, T2>,
    options?: RequestInit,
  ) => Promise<ApiResponse<T1>> = (params, options) => {
    const withBody = params as unknown as {
      body: Record<string, unknown> | undefined
    }

    const headers = createActionHeaders(
      actionConfig,
      resourceConfig,
      apiConfig,
      params,
      options,
    )

    return sendRequest(
      urlWithParams(
        url,
        actionConfig,
        resourceConfig,
        params,
      ),
      "POST",
      actionConfig,
      apiConfig,
      {
        ...options,
        headers,
        body: createBody(withBody.body),
      },
    )
  }

  return handler as ApiClientAction<T1, T2>
}

async function sendRequest<const T extends ApiActionConfig>(
  url: string,
  method: "GET" | "POST",
  actionConfig: T,
  apiConfig: ApiConfig,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    // Log fetch event
    apiConfig.logger?.debug(`Fetching: ${url}`)

    // Send request using fetch
    const res = await fetch(url, {
      ...options,
      method,
    })

    if (!res.ok) {
      // Log HTTP error
      apiConfig.logger?.error(
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
    apiConfig.logger?.debug(`Getting data of type: ${dataType}`)

    // Get data from response
    const json = actionConfig.dataType === "Text"
      ? await res.text()
      : await res.json()

    // Log data parse event
    apiConfig.logger?.debug(`Parsing data of type: ${dataType}`)

    // Parse data
    const parsed = await actionConfig.dataSchema.safeParseAsync(json)

    // Handle failed parse
    if (!parsed.success) {
      // Log parse error
      apiConfig.logger?.error(
        `Error when parsing data of type: ${dataType}
        ${JSON.stringify(parsed.error, null, 2)}`,
      )

      // return response with custom error status
      return {
        ok: false,
        data: null,
        status: StatusCode.DataParseError,
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
    apiConfig.logger?.error(e)

    // Return response with custom error status
    return {
      ok: false,
      data: null,
      status: StatusCode.UncaughtClientError,
      statusText: "Unhandled client-side error",
    }
  }
}

/* == UTILITY FUNCTIONS == */

function urlWithParams(
  url: string,
  actionConfig: ApiActionConfig,
  resourceConfig: ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  params?: object,
) {
  const withUrlParamsSchema = resourceConfig as unknown as WithURLParamsSchema
  const urlParams = getParamsBySchema(
    params,
    withUrlParamsSchema.urlParamsSchema,
  )
  const urlParamEntries = Object.entries(urlParams)
  const searchParams = getParamsBySchema(
    params,
    actionConfig.searchParamsSchema,
  )
  const searchParamEntries = Object.entries(searchParams)

  let dynamicUrl = url

  // Add url parameters to URL
  for (const [param, value] of urlParamEntries) {
    dynamicUrl = dynamicUrl.replace(`:${param}`, `${value}`)
  }

  // Add search parameters to URL
  if (searchParamEntries.length > 0) {
    dynamicUrl += "?"
    for (const [param, value] of searchParamEntries) {
      dynamicUrl += `${param}=${value}&`
    }
    dynamicUrl = dynamicUrl.substring(0, dynamicUrl.length - 1)
  }

  return dynamicUrl
}

function createActionHeaders<
  const T1 extends ApiActionConfig,
  const T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
>(
  actionConfig: T1,
  resourceConfig: T2,
  apiConfig: ApiConfig,
  params?: Params<T1, T2>,
  options?: RequestInit,
) {
  // Get headers from params
  const paramHeaders: object = getParamsBySchema(
    params,
    actionConfig.headersSchema,
  )

  // Merge default headers, param headers and option headers
  return {
    ...apiConfig.defaultHeaders,
    ...resourceConfig.defaultHeaders,
    ...actionConfig.defaultHeaders,
    ...paramHeaders,
    ...options?.headers,
  }
}

function getParamsBySchema(
  params?: object,
  schema?: ParamsSchema,
) {
  const keys = Object.keys(schema?.shape ?? {})
  const entries = Object.entries(params ?? {}).filter(([key]) =>
    keys.includes(key)
  )
  return Object.fromEntries(entries)
}

function createBody(
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
