"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodApiResource = exports.zodApiClient = void 0;
const status_codes_js_1 = require("./utils/status_codes.js");
/* == API CREATION FUNCTIONS == */
function zodApiClient(config) {
    const apiClient = Object.fromEntries(Object.entries(config.resources).map(([key, resourceConfig]) => [
        key,
        createApiClientActions(resourceConfig, config),
    ]));
    return apiClient;
}
exports.zodApiClient = zodApiClient;
function zodApiResource(path, config) {
    return {
        path,
        ...config,
    };
}
exports.zodApiResource = zodApiResource;
function createApiClientActions(resourceConfig, apiConfig) {
    const actions = Object.fromEntries(Object.entries(resourceConfig.actions)
        .map(([key, actionConfig]) => [
        key,
        key === "get"
            ? createClientBodylessAction("GET", actionConfig, resourceConfig, apiConfig)
            : key === "post"
                ? createClientBodyfullAction("POST", actionConfig, resourceConfig, apiConfig)
                : null,
    ])
        .filter(([_, action]) => !!action));
    return actions;
}
function createClientBodylessAction(method, actionConfig, resourceConfig, apiConfig) {
    // Create complete url
    const url = apiConfig.baseUrl + resourceConfig.path;
    // Create handler function
    const handler = (params) => {
        return sendRequest(urlWithParams(url, params), method, actionConfig, apiConfig, {
            ...params?.requestParams,
            headers: createActionHeaders(actionConfig, resourceConfig, apiConfig, params),
        });
    };
    // Return handler function as typed api client action
    return handler;
}
function createClientBodyfullAction(method, actionConfig, resourceConfig, apiConfig) {
    // Collect resource objects/options
    const url = apiConfig.baseUrl + resourceConfig.path;
    // Create handler function
    const handler = (params) => {
        const headers = createActionHeaders(actionConfig, resourceConfig, apiConfig, params);
        return sendRequest(urlWithParams(url, params), method, actionConfig, apiConfig, {
            ...params?.requestParams,
            headers,
            body: createBody(params?.body),
        });
    };
    return handler;
}
async function sendRequest(url, method, actionConfig, apiConfig, init) {
    try {
        // Log fetch event
        apiConfig.logger?.debug(`Fetching: ${url}`);
        // Send request using fetch
        const res = await fetch(url, {
            ...init,
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
                status: status_codes_js_1.StatusCode.DataParseError,
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
            status: status_codes_js_1.StatusCode.UncaughtClientError,
            statusText: "Unhandled client-side error",
        };
    }
}
/* == UTILITY FUNCTIONS == */
function urlWithParams(url, params) {
    // Get param entries
    const urlParamEntries = Object.entries(params?.urlParams ?? {});
    const searchParamEntries = Object.entries(params?.searchParams ?? {});
    // Create mutable url
    let mutableUrl = url;
    // Add url parameters to URL
    for (const [param, value] of urlParamEntries) {
        mutableUrl = mutableUrl.replace(`:${param}`, `${value}`);
    }
    // Add search parameters to URL
    if (searchParamEntries.length > 0) {
        mutableUrl += "?";
        for (const [param, value] of searchParamEntries) {
            mutableUrl += `${param}=${value}&`;
        }
        mutableUrl = mutableUrl.substring(0, mutableUrl.length - 1);
    }
    // Return modified url
    return mutableUrl;
}
function createActionHeaders(actionConfig, resourceConfig, apiConfig, params) {
    // Stringify param headers
    const paramHeaderEntries = Object.entries(params?.headers ?? {});
    const stringifiedParamHeaderEntries = paramHeaderEntries.map(([key, value]) => [key, `${value}`]);
    const paramHeaders = Object.fromEntries(stringifiedParamHeaderEntries);
    // Merge default headers and param headers in increasing priority
    return {
        ...apiConfig.defaultHeaders,
        ...resourceConfig.defaultHeaders,
        ...actionConfig.defaultHeaders,
        ...paramHeaders,
    };
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
