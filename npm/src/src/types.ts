import type {
  TypeOf,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodRawShape,
  ZodString,
  ZodType,
} from "zod"

// Config types
export type ApiConfig = {
  baseUrl: string
  resources: Record<
    string,
    ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>
  >
  defaultHeaders?: Record<string, string>
}

export type PathlessApiResourceConfig<T extends Path> =
  & {
    actions: ApiActionsConfig
    defaultHeaders?: Record<string, string>
  }
  & (
    URLParams<T> extends never ? object
      : {
        urlParamsSchema: RequiredParamsSchema<URLParams<T>>
      }
  )

export type ApiResourceConfig<
  T1 extends Path,
  T2 extends PathlessApiResourceConfig<T1>,
> =
  & T2
  & {
    path: T1
  }

export type ApiActionsConfig = {
  get?: ApiGetActionConfig
  post?: ApiPostActionConfig
}

export type ApiActionConfig = {
  searchParamsSchema?: ParamsSchema
  headersSchema?: ParamsSchema
  dataSchema?: ZodType
  dataType?: DataType
  defaultHeaders?: Record<string, string>
}

export type ApiGetActionConfig = ApiActionConfig & {
  dataSchema: ZodType
}

export type ApiPostActionConfig = ApiActionConfig & {
  bodySchema?: ZodObject<ZodRawShape>
  bodyType?: BodyType
}

// Client types
export type ApiClientConfig = ApiConfig & {
  logger?: Logger
}

export type ApiClient<T extends ApiConfig> = {
  [K in keyof T["resources"]]: ApiClientResource<T["resources"][K]>
}

export type ApiClientResource<
  T extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> = ApiClientActions<T["actions"], T>

export type ApiClientActions<
  T1 extends ApiActionsConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> = {
  [K in KeysOfThatDontExtend<T1, undefined>]: T1[K] extends ApiActionConfig
    ? ApiClientAction<T1[K], T2>
    : never
}

export type ApiClientAction<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> = Params<T1, T2> extends never
  ? (options?: RequestInit) => Promise<ApiResponse<T1>>
  : IsParamsOptional<Params<T1, T2>> extends true ? (
      params?: Params<T1, T2>,
      options?: RequestInit,
    ) => Promise<ApiResponse<T1>>
  : (
    params: Params<T1, T2>,
    options?: RequestInit,
  ) => Promise<ApiResponse<T1>>

// Utility types
export type LogLevel = "none" | "error" | "debug"

export type Params<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> = IsEmptyObject<CombinedParams<T1, T2>> extends true ? never
  : CombinedParams<T1, T2>

export type ParamProperty =
  | ZodString
  | ZodNumber
  | ZodBoolean
  | ZodBigInt
  | ZodDate
  | ZodEnum<[string, ...string[]]>

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

export type URLParams<T extends string> = T extends
  `${infer PartA}/${infer PartB}` ? IsURLParam<PartA> | URLParams<PartB>
  : IsURLParam<T>

export type IsURLParam<T extends string> = T extends `:${infer Param}` ? Param
  : T extends `[${infer Param}]` ? Param
  : never

export type DataType = "JSON" | "Text"

export type BodyType = "JSON" | "URLSearchParams"

export type IsParamsOptional<T> = FilterRequiredParams<T> extends
  Record<string, never> ? true : false

export type FilterRequiredParams<T> = {
  [K in KeysOfThatNeverExtend<T, undefined>]: T[K]
}

export type IsEmptyObject<T> = [keyof T] extends [never] ? true : false

export type WithURLParamsSchema = {
  urlParamsSchema: RequiredParamsSchema
}

export type CombinedParams<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> = T1 extends ApiPostActionConfig ? (
    T1["bodySchema"] extends ZodType ? { body: TypeOf<T1["bodySchema"]> }
      :
        & object
        & URLAndSearchParams<T1, T2>
  )
  : URLAndSearchParams<T1, T2>

export type URLAndSearchParams<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> =
  & (T1["headersSchema"] extends ZodType ? TypeOf<T1["headersSchema"]>
    : object)
  & (T2 extends WithURLParamsSchema ? TypeOf<T2["urlParamsSchema"]>
    : object)
  & (T1["searchParamsSchema"] extends ZodType ? TypeOf<T1["searchParamsSchema"]>
    : object)

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
    statusText: string
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

export type Logger = {
  debug: LogFunction
  error: LogFunction
  info: LogFunction
}

export type LogFunction = (text: string) => void
