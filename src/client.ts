import { z } from "zod"
import type {
  ApiClient,
  ApiClientActions,
  ApiConfig,
  ApiResourceConfig,
} from "./types.ts"

/* == API CREATION FUNCTIONS == */

/**
 * Create an API client from an API configuration.
 *
 * @param config
 * @returns
 */
export function zodApiClient<const T extends ApiConfig>(
  config: T,
): ApiClient<T> {
  const resources = Object.fromEntries(
    Object.entries(config.resources).map(([key, resourceConfig]) => [
      key,
      createResourceActions(resourceConfig, config),
    ]),
  )

  return resources as ApiClient<T>
}

const client = zodApiClient({
  baseUrl: "",
  resources: {
    test: {
      path: "/test/:id",
      actions: {
        get: {
          urlParamsSchema: z.object({
            id: z.string(),
          }),
        },
      },
    },
  },
})

client.test.get()

/**
 * Create resource actions from resource definition
 *
 * @param resDef
 * @param apiDef
 * @returns
 */
function createResourceActions<const T extends ApiResourceConfig>(
  resDef: T,
  apiDef: ApiConfig,
): ApiClientActions<T["actions"]> {
  const actions = Object.fromEntries(
    Object.entries(resDef.actions)
      .map(([key, actionDef]) => [
        key,
        key === "get"
          ? createGetInstance(actionDef, resDef, apiDef)
          : key === "post"
          ? createPostInstance(actionDef, resDef, apiDef)
          : null,
      ])
      .filter(([_, action]) => !!action),
  )

  return actions as ApiClientActions<T["actions"]>
}

/**
 * Create GET action handler
 *
 * @param getDef
 * @param resDef
 * @param apiDef
 * @returns
 */
function createGetInstance<const T extends GetConfig>(
  getDef: T,
  resDef: ResourceDefinition,
  apiDef: ApiDefinition,
): ActionInstance<T> {
  // Collect resource objects/options
  const url = (apiDef.baseUrl + resDef.path) as FullURL

  // If resource takes no parameters, create a simple GET handler
  if (
    typeof getDef.searchParamsSchema === "undefined" &&
    typeof getDef.urlParamsSchema === "undefined" &&
    typeof getDef.headersSchema === "undefined"
  ) {
    return (options?: RequestInit) =>
      sendGetRequest(url, getDef.dataSchema, {
        ...options,
        headers: {
          ...apiDef.defaultHeaders,
          ...options?.headers,
        },
      })
  }

  // Create handler function
  const handler: (
    params?: Params<T>,
    options?: RequestInit,
  ) => Promise<ApiResponse<T>> = (params, options) => {
    return sendGetRequest(
      urlWithParams(url, getDef, params),
      getDef.dataSchema,
      {
        ...options,
        headers: createActionHeaders(getDef, resDef, apiDef, params, options),
      },
    )
  }

  return handler as ActionInstance<T>
}

/**
 * Create POST action handler
 *
 * @param postDef
 * @param resDef
 * @param apiDef
 * @returns
 */
function createPostInstance<const T extends PostDefinition>(
  postDef: T,
  resDef: ResourceDefinition,
  apiDef: ApiDefinition,
): ActionInstance<T> {
  // Collect resource objects/options
  const url = (apiDef.baseUrl + resDef.path) as FullURL

  // If resource takes no parameters, create a simple POST handler
  if (
    typeof postDef.searchParamsSchema === "undefined" &&
    typeof postDef.urlParamsSchema === "undefined" &&
    typeof postDef.headersSchema === "undefined" &&
    typeof postDef.bodySchema === "undefined"
  ) {
    return (options?: RequestInit) =>
      sendPostRequest(url, postDef.dataSchema, {
        ...options,
        headers: {
          ...apiDef.defaultHeaders,
          ...options?.headers,
        },
      })
  }

  // Create handler function
  const handler: (
    params?: Params<T>,
    options?: RequestInit,
  ) => Promise<ApiResponse<T>> = (params, options) => {
    const bodyParams = getParamsBySchema(params, postDef.bodySchema)
    const bodyType = postDef.bodyType ?? "JSON"
    const body = createBody(bodyParams, bodyType)
    const headers = createActionHeaders(
      postDef,
      resDef,
      apiDef,
      params,
      options,
    )

    return sendPostRequest(
      urlWithParams(url, postDef, params),
      postDef.dataSchema,
      {
        ...options,
        headers,
        body,
      },
    )
  }

  return handler as ActionInstance<T>
}

/* == REQUEST HANDLERS == */

/**
 * Get request handler function
 *
 * @param url
 * @param dataSchema
 * @param options
 * @returns
 */
async function sendGetRequest<const T extends GetDefinition>(
  url: FullURL,
  dataSchema?: T["dataSchema"],
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  return await sendRequest(url, dataSchema, {
    ...options,
    method: "GET",
  })
}

/**
 * Post request handler function
 *
 * @param url
 * @param dataSchema
 * @param options
 * @returns
 */
async function sendPostRequest<const T extends PostDefinition>(
  url: FullURL,
  dataSchema?: T["dataSchema"],
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  return await sendRequest(url, dataSchema, {
    ...options,
    method: "POST",
  })
}

/**
 * Base request handler function
 *
 * @param url
 * @param dataSchema
 * @param options
 * @returns
 */
async function sendRequest<const T extends ActionDefinition>(
  url: string,
  dataSchema?: T["dataSchema"],
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options)

    if (!res.ok) {
      // Log HTTP error
      console.error(
        `Error fetching: ${url}, Status: ${res.status} ${res.statusText} `,
      )

      return {
        ok: false,
        data: null,
        status: res.status,
      }
    }

    // If no data schema, return response without data
    if (!dataSchema) {
      return {
        ok: true,
        data: null,
        status: res.status,
      }
    }

    // Get and parse data
    const json = await res.json()
    const data = await dataSchema.parseAsync(json)

    return {
      ok: true,
      data,
      status: res.status,
    }
  } catch (e) {
    // Catch and log unhandled errors
    console.error(e)

    return {
      ok: false,
      data: null,
      status: 500,
    }
  }
}

/* == UTILITY FUNCTIONS == */

/**
 * Extend url with url parameters and search parameters
 *
 * @param url
 * @param params
 * @param actionDef
 * @returns
 */
function urlWithParams<const T extends ActionDefinition>(
  url: FullURL,
  actionDef: T,
  params?: Params<T>,
) {
  const urlParams = getParamsBySchema(params, actionDef.urlParamsSchema)
  const urlParamEntries = Object.entries(urlParams)
  const searchParams = getParamsBySchema(params, actionDef.searchParamsSchema)
  const searchParamEntries = Object.entries(searchParams)

  let dynamicUrl = url

  // Add url parameters to URL
  for (const [param, value] of urlParamEntries) {
    dynamicUrl = dynamicUrl.replace(`:${param}`, `${value}`) as FullURL
  }

  // Add search parameters to URL
  if (searchParamEntries.length > 0) {
    dynamicUrl += "?"
    for (const [param, value] of searchParamEntries) {
      dynamicUrl += `${param}=${value}&`
    }
    dynamicUrl = dynamicUrl.substring(0, dynamicUrl.length - 1) as FullURL
  }

  return dynamicUrl
}

/**
 * Create merged headers for resource action
 *
 * @param params
 * @param actionDef
 * @param resDef
 * @param apiDef
 * @param options
 * @returns
 */
function createActionHeaders<const T extends ActionDefinition>(
  actionDef: T,
  resDef: ResourceDefinition,
  apiDef: ApiDefinition,
  params?: Params<T>,
  options?: RequestInit,
) {
  // Get headers from params
  const paramHeaders: object = getParamsBySchema(
    params,
    actionDef.headersSchema,
  )

  // Merge default headers, param headers and option headers
  return {
    ...apiDef.defaultHeaders,
    ...resDef.defaultHeaders,
    ...actionDef.defaultHeaders,
    ...paramHeaders,
    ...options?.headers,
  }
}

/**
 * Extract params by their data schema
 *
 * @param params
 * @param schema
 * @returns
 */
function getParamsBySchema(
  params?: Params<ActionDefinition>,
  schema?: ZodObject<any>,
) {
  const keys = Object.keys(schema?.shape ?? {})
  const entries = Object.entries(params ?? {}).filter(([key]) =>
    keys.includes(key)
  )
  return Object.fromEntries(entries)
}

function createBody(bodyParams: Record<string, unknown>, bodyType: BodyType) {
  if (bodyType === "JSON") {
    return JSON.stringify(bodyParams)
  }

  const urlSearchParams = new URLSearchParams()

  Object.entries(bodyParams).forEach(([key, value]) =>
    urlSearchParams.append(key, `${value}`)
  )

  return urlSearchParams
}
