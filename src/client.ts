import type {
  ApiActionConfig,
  ApiActionMethod,
  ApiClient,
  ApiClientAction,
  ApiClientActions,
  ApiClientConfig,
  ApiResourceConfig,
  Fetcher,
  Path,
  PathlessApiResourceConfig,
  PossibleApiClientAction,
} from "./types.ts"
import { sendRequest } from "./utils/request.ts"

export function client<
  const T1 extends Fetcher,
  const T2 extends ApiClientConfig<T1>,
>(
  config: T2,
): ApiClient<T2> {
  const resourceEntries = Object
    .entries(config.resources)
    .map(([key, resourceConfig]) => [
      key,
      createApiClientActions(resourceConfig, config),
    ])

  return Object.fromEntries(resourceEntries) as ApiClient<T2>
}

function createApiClientActions<
  const T1 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  const T2 extends ApiClientConfig<Fetcher>,
>(
  resourceConfig: T1,
  apiClientConfig: T2,
): ApiClientActions<T1["actions"], T1, T2> {
  const actionEntries = Object
    .entries(resourceConfig.actions)
    .map(([key, actionConfig]) => [
      key,
      createApiClientAction(
        key as ApiActionMethod,
        actionConfig,
        resourceConfig,
        apiClientConfig,
      ),
    ])

  const actions = Object.fromEntries(actionEntries)

  return actions as ApiClientActions<T1["actions"], T1, T2>
}

function createApiClientAction<
  const T1 extends ApiActionConfig,
  const T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  const T3 extends ApiClientConfig<Fetcher>,
>(
  method: ApiActionMethod,
  actionConfig: T1,
  resourceConfig: T2,
  apiClientConfig: T3,
): ApiClientAction<T1, T2, T3> {
  // Create handler function
  const handler: PossibleApiClientAction = async (params) => {
    return await sendRequest(
      method,
      actionConfig,
      resourceConfig,
      apiClientConfig,
      params,
    )
  }

  return handler as ApiClientAction<T1, T2, T3>
}
