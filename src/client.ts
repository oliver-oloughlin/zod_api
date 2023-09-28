import { StatusCode } from "./StatusCode.ts"
import type {
  ApiActionConfig,
  ApiBodyfullActionConfig,
  ApiBodylessActionConfig,
  ApiClient,
  ApiClientAction,
  ApiClientActionMethod,
  ApiClientActions,
  ApiClientConfig,
  ApiClientState,
  ApiResourceConfig,
  ApiResponse,
  BodyfullApiActionMethod,
  BodylessApiActionMethod,
  BodyType,
  Fetcher,
  Path,
  PathlessApiResourceConfig,
  PossibleApiClientAction,
  PossibleApiClientActionParams,
} from "./types.ts"

/* == API CREATION FUNCTIONS == */

export function zodApiClient<
  const T1 extends Fetcher,
  const T2 extends ApiClientConfig<T1>,
>(
  config: T2,
): ApiClient<T2> {
  const state = {}

  const resourceEntries = Object
    .entries(config.resources)
    .map(([key, resourceConfig]) => [
      key,
      createApiClientActions(resourceConfig, config, state),
    ])

  return Object.fromEntries(resourceEntries) as ApiClient<T2>
}

function createApiClientActions<
  const T1 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  const T2 extends ApiClientConfig<Fetcher>,
>(
  resourceConfig: T1,
  apiConfig: T2,
  state: ApiClientState,
): ApiClientActions<T1["actions"], T1, T2> {
  const actionEntries = Object
    .entries(resourceConfig.actions)
    .map(([key, actionConfig]) => [
      key,
      key === "get" || key === "head"
        ? createClientBodylessAction(
          key.toUpperCase() as BodylessApiActionMethod,
          actionConfig as ApiBodylessActionConfig,
          resourceConfig,
          apiConfig,
          state,
        )
        : createClientBodyfullAction(
          key.toUpperCase() as BodyfullApiActionMethod,
          actionConfig as ApiBodyfullActionConfig,
          resourceConfig,
          apiConfig,
          state,
        ),
    ])

  const actions = Object.fromEntries(actionEntries)

  return actions as ApiClientActions<T1["actions"], T1, T2>
}

function createClientBodylessAction<
  const T1 extends ApiBodylessActionConfig,
  const T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  const T3 extends ApiClientConfig<Fetcher>,
>(
  method: BodylessApiActionMethod,
  actionConfig: T1,
  resourceConfig: T2,
  apiConfig: T3,
  state: ApiClientState,
): ApiClientAction<T1, T2, T3> {
  // Create complete url
  const url = apiConfig.baseUrl + resourceConfig.path

  // Create handler function
  const handler: PossibleApiClientAction = (params) => {
    return sendRequest(
      urlWithParams(url, params),
      method,
      actionConfig,
      apiConfig,
      createRequestParams(apiConfig, params),
    )
  }

  // Return handler function as typed api client action
  return handler as ApiClientAction<T1, T2, T3>
}

function createClientBodyfullAction<
  const T1 extends ApiBodyfullActionConfig,
  const T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  const T3 extends ApiClientConfig<Fetcher>,
>(
  method: BodyfullApiActionMethod,
  actionConfig: T1,
  resourceConfig: T2,
  apiConfig: T3,
  state: ApiClientState,
): ApiClientAction<T1, T2, T3> {
  // Collect resource objects/options
  const url = apiConfig.baseUrl + resourceConfig.path

  // Create handler function
  const handler: PossibleApiClientAction = (params) => {
    return sendRequest(
      urlWithParams(url, params),
      method,
      actionConfig,
      apiConfig,
      {
        ...createRequestParams(apiConfig, params),
        body: createBody(params?.body, actionConfig.bodyType),
      },
    )
  }

  return handler as ApiClientAction<T1, T2, T3>
}

async function sendRequest<const T extends ApiActionConfig>(
  url: string,
  method: ApiClientActionMethod,
  actionConfig: T,
  apiConfig: ApiClientConfig<Fetcher>,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    // Log fetch event
    apiConfig.logger?.debug(`Fetching: ${url}`)

    // Set fetcher
    const fetcher = apiConfig.fetcher ?? fetch

    // Send request using fetch
    const res = await fetcher(url, {
      ...init,
      method: method.toUpperCase(),
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

function createRequestParams(
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
