import {
  type TypeOf,
  type ZodBigInt,
  type ZodBoolean,
  type ZodDate,
  type ZodEnum,
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
  get?: ApiBodylessActionConfig
  post?: ApiBodyfullActionConfig
}

export type ApiActionConfig = ApiBodylessActionConfig | ApiBodyfullActionConfig

export type ApiBodylessActionConfig = {
  searchParamsSchema?: ParamsSchema
  headersSchema?: ParamsSchema
  dataSchema?: ZodType
  dataType?: DataType
  defaultHeaders?: Record<string, string>
}

export type ApiBodyfullActionConfig = {
  searchParamsSchema?: ParamsSchema
  headersSchema?: ParamsSchema
  dataSchema?: ZodType
  dataType?: DataType
  defaultHeaders?: Record<string, string>
  bodySchema?: ZodObject<ZodRawShape>
  bodyType?: BodyType
}

// Client types
export type ApiClientConfig = ApiConfig & {
  fetcher?: Fetcher
  logger?: Logger
}

export type ApiClient<T extends ApiClientConfig> = {
  [K in keyof T["resources"]]: ApiClientResource<T["resources"][K], T>
}

export type ApiClientResource<
  T1 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T2 extends ApiClientConfig,
> = ApiClientActions<T1["actions"], T1, T2>

export type ApiClientActions<
  T1 extends ApiActionsConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T3 extends ApiClientConfig,
> = {
  [K in KeysOfThatDontExtend<T1, undefined>]: T1[K] extends ApiActionConfig
    ? ApiClientAction<T1[K], T2, T3>
    : never
}

export type ApiClientAction<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T3 extends ApiClientConfig,
> = IsOptionalObject<ApiClientActionParams<T1, T2, T3>> extends true
  ? (params?: ApiClientActionParams<T1, T2, T3>) => Promise<ApiResponse<T1>>
  : (params: ApiClientActionParams<T1, T2, T3>) => Promise<ApiResponse<T1>>

export type ApiClientActionParams<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T3 extends ApiClientConfig,
> =
  & {
    requestParams?: RequestParams<
      T3["fetcher"] extends Fetcher ? T3["fetcher"] : Fetcher
    >
  }
  & (
    T2 extends WithURLParamsSchema
      ? ParseParams<T2, "urlParamsSchema", "urlParams">
      : object
  )
  & ParseParams<T1, "headersSchema", "headers">
  & ParseParams<T1, "searchParamsSchema", "searchParams">
  & (
    T1 extends ApiBodyfullActionConfig
      ? ParseParams<T1, "bodySchema", "body", false>
      : object
  )

export type PossibleApiClientAction = (
  params?: PossibleApiClientActionParams,
) => Promise<ApiResponse<ApiActionConfig>>

export type PossibleApiClientActionParams = ApiClientActionParams<
  Required<ApiBodyfullActionConfig>,
  Required<ApiResourceConfig<"/:param", PathlessApiResourceConfig<"/:param">>>,
  ApiClientConfig
>

export type ApiClientActionMethod =
  | ApiClientBodylessActionMethod
  | ApiClientBodyfullActionMethod

export type ApiClientBodylessActionMethod = "GET" | "HEAD"

export type ApiClientBodyfullActionMethod =
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"

// Utility types
export type LogLevel = "none" | "error" | "debug"

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
  `${infer PartA}/${infer PartB}` ? ParseURLParam<PartA> | URLParams<PartB>
  : ParseURLParam<T>

export type ParseURLParam<T extends string> = T extends `:${infer Param}`
  ? Param
  : T extends `[${infer Param}]` ? Param
  : never

export type HasURLParam<T extends string> = HasMembersExtending<
  T extends `${infer PartA}/${infer PartB}`
    ? IsURLParam<PartA> | HasURLParam<PartB>
    : IsURLParam<T>,
  true
>

export type IsURLParam<T> = T extends `:${string}` ? true
  : T extends `[${string}]` ? true
  : false

export type DataType = "JSON" | "Text"

export type BodyType = "JSON" | "URLSearchParams"

export type IsOptionalObject<T> = FilterRequiredParams<T> extends
  Record<string, never> ? true : false

export type FilterRequiredParams<T> = {
  [K in KeysOfThatNeverExtend<T, undefined>]: T[K]
}

export type IsEmptyObject<T> = [keyof T] extends [never] ? true : false

export type WithURLParamsSchema = {
  urlParamsSchema: RequiredParamsSchema
}

export type ParseParams<
  T,
  P extends keyof T,
  K extends string,
  AllowOptional = true,
> = T[P] extends ZodType ? (
    IsEmptyObject<T[P]> extends false ? (
        IsOptionalObject<TypeOf<T[P]>> extends true ? (
            AllowOptional extends true ? { [key in K]?: TypeOf<T[P]> }
              : { [key in K]: TypeOf<T[P]> }
          )
          : { [key in K]: TypeOf<T[P]> }
      )
      : object
  )
  : object

export type RequestParams<T extends Fetcher> = Omit<
  Required<Parameters<T>>["1"],
  "body" | "method" | "headers"
>

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

export type Fetcher = typeof fetch
