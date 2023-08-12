import {
  type TypeOf,
  type ZodBoolean,
  type ZodNullable,
  type ZodNumber,
  type ZodObject,
  type ZodOptional,
  type ZodRawShape,
  type ZodString,
  type ZodType,
} from "zod"

// Config types
export type ApiConfig = {
  baseUrl: string
  resources: Record<string, ApiResourceConfig>
  defaultHeaders?: Record<string, string>
}

export type ApiResourceConfig = {
  path: Path
  actions: ApiActionsConfig
  defaultHeaders?: Record<string, string>
}

export type ApiActionsConfig = {
  get?: ApiGetActionConfig
  post?: ApiPostActionConfig
}

export type ApiActionConfig = {
  urlParamsSchema?: RequiredParamsSchema
  searchParamsSchema?: ParamsSchema
  headersSchema?: ParamsSchema
  dataSchema?: ZodObject<ZodRawShape>
  defaultHeaders?: Record<string, string>
}

export type ApiGetActionConfig = ApiActionConfig

export type ApiPostActionConfig = ApiActionConfig & {
  bodySchema?: ZodType
  bodyType?: BodyType
}

// Client types
export type ApiClient<T extends ApiConfig> = {
  [K in keyof T["resources"]]: ApiClientResource<T["resources"][K]>
}

export type ApiClientResource<T extends ApiResourceConfig> = ApiClientActions<
  T["actions"]
>

export type ApiClientActions<T extends ApiActionsConfig> = {
  [K in KeysOfThatDontExtend<T, undefined>]: T[K] extends ApiActionConfig
    ? ApiClientAction<T[K]>
    : never
}

export type ApiClientAction<T extends ApiActionConfig> = CheckParamsIsOptional<
  Params<T>
> extends true
  ? (params?: Params<T>, options?: RequestInit) => Promise<ApiResponse<T>>
  : Params<T> extends undefined
    ? (options?: RequestInit) => Promise<ApiResponse<T>>
  : (params: Params<T>, options?: RequestInit) => Promise<ApiResponse<T>>

// Utility types
export type ParamProperty = ZodString | ZodNumber | ZodBoolean

export type ParamsSchema<T extends string = string> = ZodObject<
  {
    [K in T]:
      | ParamProperty
      | ZodOptional<ParamProperty>
      | ZodNullable<ParamProperty>
  }
>

export type RequiredParamsSchema<T extends string = string> = ZodObject<
  {
    [K in T]: ParamProperty
  }
>

export type Path = `/${string}`

export type BodyType = "JSON" | "URLSearchParams"

export type CheckParamsIsOptional<T extends Params<ApiActionConfig>> =
  FilterRequiredParams<T> extends Record<string, never> ? true : false

export type FilterRequiredParams<T extends Params<ApiActionConfig>> = {
  [K in KeysOfThatNeverExtend<T, undefined>]: T[K]
}

export type Params<T extends ApiActionConfig> = CombinedParams<T> extends
  Record<
    string,
    never
  > ? never
  : CombinedParams<T>

export type CombinedParams<T extends ApiActionConfig> =
  & (T["headersSchema"] extends ParamsSchema ? TypeOf<T["headersSchema"]>
    : Record<string, never>)
  & (T["urlParamsSchema"] extends RequiredParamsSchema
    ? TypeOf<T["urlParamsSchema"]>
    : Record<string, never>)
  & (T["searchParamsSchema"] extends ParamsSchema
    ? TypeOf<T["searchParamsSchema"]>
    : Record<string, never>)
  & (T extends ApiPostActionConfig
    ? T["bodySchema"] extends ZodType ? TypeOf<T["bodySchema"]>
    : Record<string, never>
    : Record<string, never>)

export type KeysOfThatExtend<T1, T2> = keyof {
  [K in keyof T1 as T1[K] extends T2 ? K : never]: unknown
}

export type KeysOfThatDontExtend<T1, T2> = keyof {
  [K in keyof T1 as T1[K] extends T2 ? never : K]: unknown
}

export type KeysOfThatNeverExtend<T1, T2> = keyof {
  [
    K in keyof T1 as HasMembersExtending<T1[K], T2> extends true ? never
      : K
  ]: unknown
}

export type HasMembersExtending<T1, T2> = Extract<T1, T2> extends never ? false
  : true

export type ApiResponse<T extends ApiActionConfig> =
  & {
    status: number
  }
  & (
    | {
      ok: true
      data: T["dataSchema"] extends ZodType ? TypeOf<T["dataSchema"]> : null
    }
    | {
      ok: false
      data: null
    }
  )
