import {
  ApiActionHandlerContext,
  ApiActionMethod,
  ApiBodyfullActionConfig,
  ApiResourceConfig,
  ApiServerConfig,
  ApiServerHandlers,
  PathlessApiResourceConfig,
} from "../types.ts"
import { createActionHandlerContext } from "./handler_context.ts"
import { badRequest, methodNotAllowed, notFound, ok } from "./response.ts"

export async function routeRequest(
  req: Request,
  apiServerConfig: ApiServerConfig,
  apiServerHandlers: ApiServerHandlers<ApiServerConfig>,
): Promise<Response> {
  // Run middleware and check for response
  const middlewareResponse = await apiServerConfig.middleware?.(req)
  if (middlewareResponse) {
    return middlewareResponse
  }

  // Get action method
  const method = req.method.toLowerCase() as ApiActionMethod

  // Collect resource handlers + config
  const resourceHandlers = Object.entries(apiServerHandlers).map((
    [key, actionHandlers],
  ) => ({
    resourceConfig: apiServerConfig.resources[key],
    actionHandlers,
  }))

  // Loop over resource handlers and execute url pattern to find match
  for (const { resourceConfig, actionHandlers } of resourceHandlers) {
    const pattern = new URLPattern({ pathname: resourceConfig.path })
    const patternResult = pattern.exec(req.url)

    // Continue to next if no match
    if (!patternResult) {
      continue
    }

    // Get correct action handler, return method not allowed response if not set
    const actionHandler = actionHandlers[method]
    if (!actionHandler) {
      return methodNotAllowed()
    }

    // Get accompanying action config
    const actionConfig = resourceConfig
      .actions[method] as ApiBodyfullActionConfig

    // Create action handler context
    const ctx = await createActionHandlerContext(
      req,
      patternResult,
      resourceConfig as ApiResourceConfig<
        "/:param",
        PathlessApiResourceConfig<"/:param">
      >,
      actionConfig,
    )

    // Return bad request response if context not set
    if (!ctx) {
      return badRequest()
    }

    // Run action handler
    const result = await actionHandler(
      req,
      ctx as ApiActionHandlerContext<unknown, unknown>,
    )

    // If result is ok, return successful response
    if (result.ok) {
      const dataType = actionConfig.dataType ?? "JSON"

      const data = dataType === "JSON"
        ? JSON.stringify(result.data)
        : `${result.data}`

      return ok(data)
    }

    // If result is not ok, return error response
    return new Response(result.message, {
      status: result.status,
    })
  }

  // If no matching resource handler is found, return not found response
  return notFound()
}
