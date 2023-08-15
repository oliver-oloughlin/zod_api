import { StatusCode } from "./utils/status_codes.js";
/* == API CREATION FUNCTIONS == */
export function zodApiClient(config) {
    const apiClient = Object.fromEntries(Object.entries(config.resources).map(([key, resourceConfig]) => [
        key,
        createApiClientActions(resourceConfig, config),
    ]));
    return apiClient;
}
export function zodApiResource(path, config) {
    return {
        path,
        ...config,
    };
}
function createApiClientActions(resourceConfig, apiConfig) {
    const actions = Object.fromEntries(Object.entries(resourceConfig.actions)
        .map(([key, actionConfig]) => [
        key,
        key === "get"
            ? createClientGetAction(actionConfig, resourceConfig, apiConfig)
            : key === "post"
                ? createClientPostAction(actionConfig, resourceConfig, apiConfig)
                : null,
    ])
        .filter(([_, action]) => !!action));
    return actions;
}
function createClientGetAction(actionConfig, resourceConfig, apiConfig) {
    // Collect resource objects/options
    const url = apiConfig.baseUrl + resourceConfig.path;
    const withUrlParamsSchema = resourceConfig;
    // If resource takes no parameters, create a simple GET handler
    if (typeof actionConfig.searchParamsSchema === "undefined" &&
        typeof withUrlParamsSchema.urlParamsSchema === "undefined" &&
        typeof actionConfig.headersSchema === "undefined") {
        return (options) => sendRequest(url, "GET", actionConfig, apiConfig, {
            ...options,
            headers: {
                ...apiConfig.defaultHeaders,
                ...options?.headers,
            },
        });
    }
    // Create handler function
    const handler = (params, options) => {
        return sendRequest(urlWithParams(url, actionConfig, resourceConfig, params), "GET", actionConfig, apiConfig, {
            ...options,
            headers: createActionHeaders(actionConfig, resourceConfig, apiConfig, params, options),
        });
    };
    return handler;
}
function createClientPostAction(actionConfig, resourceConfig, apiConfig) {
    // Collect resource objects/options
    const url = apiConfig.baseUrl + resourceConfig.path;
    const withUrlParamsSchema = resourceConfig;
    // If resource takes no parameters, create a simple POST handler
    if (typeof actionConfig.searchParamsSchema === "undefined" &&
        typeof withUrlParamsSchema.urlParamsSchema === "undefined" &&
        typeof actionConfig.headersSchema === "undefined" &&
        typeof actionConfig.bodySchema === "undefined") {
        return (options) => sendRequest(url, "POST", actionConfig, apiConfig, {
            ...options,
            headers: {
                ...apiConfig.defaultHeaders,
                ...options?.headers,
            },
        });
    }
    // Create handler function
    const handler = (params, options) => {
        const withBody = params;
        const headers = createActionHeaders(actionConfig, resourceConfig, apiConfig, params, options);
        return sendRequest(urlWithParams(url, actionConfig, resourceConfig, params), "POST", actionConfig, apiConfig, {
            ...options,
            headers,
            body: createBody(withBody.body),
        });
    };
    return handler;
}
async function sendRequest(url, method, actionConfig, apiConfig, options) {
    try {
        // Log fetch event
        apiConfig.logger?.debug(`Fetching: ${url}`);
        // Send request using fetch
        const res = await fetch(url, {
            ...options,
            method,
        });
        if (!res.ok) {
            // Log HTTP error
            apiConfig.logger?.error(`Error fetching: ${url}, Status: ${res.status} ${res.statusText}`);
            // Return error response
            return {
                ok: false,
                data: null,
                status: res.status,
                statusText: res.statusText,
            };
        }
        // If no data schema, return successful response without data
        if (!actionConfig.dataSchema) {
            return {
                ok: true,
                data: null,
                status: res.status,
                statusText: res.statusText,
            };
        }
        // Get and parse data
        const dataType = actionConfig.dataType ?? "JSON";
        // Log data get event
        apiConfig.logger?.debug(`Getting data of type: ${dataType}`);
        // Get data from response
        const json = actionConfig.dataType === "Text"
            ? await res.text()
            : await res.json();
        // Log data parse event
        apiConfig.logger?.debug(`Parsing data of type: ${dataType}`);
        // Parse data
        const parsed = await actionConfig.dataSchema.safeParseAsync(json);
        // Handle failed parse
        if (!parsed.success) {
            // Log parse error
            apiConfig.logger?.error(`Error when parsing data of type: ${dataType}
        ${JSON.stringify(parsed.error, null, 2)}`);
            // return response with custom error status
            return {
                ok: false,
                data: null,
                status: StatusCode.DataParseError,
                statusText: "Data not parsed successfully",
            };
        }
        // Return successful response with parsed data
        return {
            ok: true,
            data: parsed.data,
            status: res.status,
            statusText: res.statusText,
        };
    }
    catch (e) {
        // Log error
        apiConfig.logger?.error(e);
        // Return response with custom error status
        return {
            ok: false,
            data: null,
            status: StatusCode.UncaughtClientError,
            statusText: "Unhandled client-side error",
        };
    }
}
/* == UTILITY FUNCTIONS == */
function urlWithParams(url, actionConfig, resourceConfig, params) {
    const withUrlParamsSchema = resourceConfig;
    const urlParams = getParamsBySchema(params, withUrlParamsSchema.urlParamsSchema);
    const urlParamEntries = Object.entries(urlParams);
    const searchParams = getParamsBySchema(params, actionConfig.searchParamsSchema);
    const searchParamEntries = Object.entries(searchParams);
    let dynamicUrl = url;
    // Add url parameters to URL
    for (const [param, value] of urlParamEntries) {
        dynamicUrl = dynamicUrl.replace(`:${param}`, `${value}`);
    }
    // Add search parameters to URL
    if (searchParamEntries.length > 0) {
        dynamicUrl += "?";
        for (const [param, value] of searchParamEntries) {
            dynamicUrl += `${param}=${value}&`;
        }
        dynamicUrl = dynamicUrl.substring(0, dynamicUrl.length - 1);
    }
    return dynamicUrl;
}
function createActionHeaders(actionConfig, resourceConfig, apiConfig, params, options) {
    // Get headers from params
    const paramHeaders = getParamsBySchema(params, actionConfig.headersSchema);
    // Merge default headers, param headers and option headers
    return {
        ...apiConfig.defaultHeaders,
        ...resourceConfig.defaultHeaders,
        ...actionConfig.defaultHeaders,
        ...paramHeaders,
        ...options?.headers,
    };
}
function getParamsBySchema(params, schema) {
    const keys = Object.keys(schema?.shape ?? {});
    const entries = Object.entries(params ?? {}).filter(([key]) => keys.includes(key));
    return Object.fromEntries(entries);
}
function createBody(bodyParams, bodyType = "JSON") {
    if (!bodyParams) {
        return undefined;
    }
    if (bodyType === "JSON") {
        return JSON.stringify(bodyParams);
    }
    const urlSearchParams = new URLSearchParams();
    Object.entries(bodyParams).forEach(([key, value]) => urlSearchParams.append(key, `${value}`));
    return urlSearchParams;
}
