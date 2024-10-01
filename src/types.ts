import type {
  input,
  TypeOf,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodRawShape,
  ZodString,
  ZodType,
  ZodTypeDef,
  ZodUnion,
} from "zod"

/********************/
/*                  */
/*   CONFIG TYPES   */
/*                  */
/********************/

/** Zod API Configurations  */
export type ApiConfig = {
  resources: ApiResourceRecord
}

/** Record of Zod API resource configurations */
export type ApiResourceRecord = Record<
  string,
  ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>
>

/** Zod API resource configruation without `path` option */
export type PathlessApiResourceConfig<T extends Path> =
  & {
    actions: ApiActionsConfig
  }
  & (
    URLParams<T> extends never ? object
      : {
        urlParamsSchema: RequiredParamsSchema<URLParams<T>>
      }
  )

/** Zod API resource configruation with `path` option */
export type ApiResourceConfig<
  T1 extends Path,
  T2 extends PathlessApiResourceConfig<T1>,
> =
  & T2
  & {
    path: T1
  }

/** Zod API action configurations record */
export type ApiActionsConfig =
  & {
    [K in BodylessApiActionMethod]?: ApiBodylessActionConfig
  }
  & {
    [K in BodyfullApiActionMethod]?: ApiBodyfullActionConfig
  }

/** Zod API action configuration */
export type ApiActionConfig = ApiBodylessActionConfig | ApiBodyfullActionConfig

/** Zod API bodyless action configuration */
export type ApiBodylessActionConfig = {
  searchParamsSchema?: ParamsSchema
  headersSchema?: ParamsSchema
  dataSchema?: ZodType
  dataType?: DataType
}

/** Zod API bodyfull action configuration */
export type ApiBodyfullActionConfig = ApiBodylessActionConfig & {
  bodySchema?: ZodObject<ZodRawShape>
  bodyType?: BodyType
}

/********************/
/*                  */
/*   CLIENT TYPES   */
/*                  */
/********************/

/** Zod API client configruation */
export type ApiClientConfig<T extends Fetcher> = ApiConfig & {
  /** Base URL for API */
  baseUrl: string

  /** Fetcher for sending requests - must extend the Fertch API */
  fetcher?: T

  /** Logger object */
  logger?: Logger

  /** Request throttle strategy - Sets a delay between requests */
  throttle?: Throttle

  /** Default request parameters that are included in each request (can be overridden) */
  requestParams?: DefaultRequestParams<T>

  /** Authentication strategy - Sets authentication headers for each request */
  auth?: Auth

  /**
   * Number of milliseconds to wait between retry attempts.
   *
   * @default [500,1000,3000]
   */
  retry?: number[]
}

export type ApiClient<T extends ApiClientConfig<Fetcher>> = {
  [K in keyof T["resources"]]: ApiClientResource<T["resources"][K], T>
}

export type ApiClientResource<
  T1 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T2 extends ApiClientConfig<Fetcher>,
> = ApiClientActions<T1["actions"], T1, T2>

export type ApiClientActions<
  T1 extends ApiActionsConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T3 extends ApiClientConfig<Fetcher>,
> = {
  [K in KeysOfThatDontExtend<T1, undefined>]: T1[K] extends ApiActionConfig
    ? ApiClientAction<T1[K], T2, T3>
    : never
}

export type ApiClientAction<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T3 extends ApiClientConfig<Fetcher>,
> = IsOptionalObject<ApiClientActionParams<T1, T2, T3>> extends true
  ? (params?: ApiClientActionParams<T1, T2, T3>) => Promise<ApiResponse<T1>>
  : (params: ApiClientActionParams<T1, T2, T3>) => Promise<ApiResponse<T1>>

export type ApiClientActionParams<
  T1 extends ApiActionConfig,
  T2 extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
  T3 extends ApiClientConfig<Fetcher>,
> =
  & {
    requestParams?: ApiActionRequestParams<
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

export type PossibleApiClientActionParams = Partial<
  ApiClientActionParams<
    Required<ApiBodyfullActionConfig>,
    Required<
      ApiResourceConfig<"/:param", PathlessApiResourceConfig<"/:param">>
    >,
    ApiClientConfig<Fetcher>
  >
>

export type ApiActionMethod =
  | BodylessApiActionMethod
  | BodyfullApiActionMethod

export type Throttle = {
  throttle(): Promise<void>
}

/******************/
/*                */
/*   AUTH TYPES   */
/*                */
/******************/
export type Auth = {
  createAuthHeaders: (
    refresh?: boolean,
    retries?: number,
  ) => HeadersInit | Promise<HeadersInit>
}

export type BearerTokenAuthOptions<T1, T2 extends Fetcher> = {
  /** Complete URL for token endpoint */
  tokenUrl: string

  /** Client id/key (username) */
  clientId: string

  /** Client secret (password) */
  clientSecret: string

  /** Mapper function from token data to token string */
  mapper: (data: T1) => string

  /** Additional or override request parameters */
  requestParams?: RequestParams<T2>

  /** Validation function to detect invalid token */
  tokenValidator?: (data: T1) => boolean
}

export type ApiKeyAuthOptions = {
  /** API key value. */
  key: string

  /** App id value. */
  id?: string

  /**
   * API key header name.
   * @default "x-api-key"
   */
  keyHeader?: string

  /**
   * App id header name.
   * @default "x-app-id"
   */
  idHeader?: string
}

export type BasicAuthOptions = {
  /** API id value. */
  id: string

  /** API secret value. */
  secret: string
}

/*********************/
/*                   */
/*   UTILITY TYPES   */
/*                   */
/*********************/

export type BodylessApiActionMethod = "get"

export type BodyfullApiActionMethod =
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"

export type PrimitiveParamProperty =
  | ZodString
  | ZodNumber
  | ZodBoolean
  | ZodBigInt
  | ZodDate
  | ZodEnum<[string, ...string[]]>
  | ZodLiteral<number | string | boolean | bigint>

type EffectParamProperty = ZodEffects<
  PrimitiveParamProperty,
  unknown,
  number | string | boolean | bigint
>

type ZodTypeParamProperty = ZodType<
  unknown,
  ZodTypeDef,
  unknown
>

export type ParamProperty =
  | PrimitiveParamProperty
  | ZodUnion<[ParamProperty, ...ParamProperty[]]>
  | ZodDefault<ParamProperty>

export type ParamsSchema<T extends string = string> = ZodObject<
  {
    [K in T]:
      | ParamProperty
      | ZodOptional<ParamProperty>
      | ZodNullable<ParamProperty>
      | EffectParamProperty
      | ZodTypeParamProperty
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
  : T extends `{${infer Param}}` ? Param
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
        IsOptionalObject<input<T[P]>> extends true ? (
            AllowOptional extends true ? { [key in K]?: input<T[P]> }
              : { [key in K]: input<T[P]> }
          )
          : { [key in K]: input<T[P]> }
      )
      : object
  )
  : object

export type RequestParams<T extends Fetcher> = Required<Parameters<T>>["1"]

export type DefaultRequestParams<T extends Fetcher> = Omit<
  RequestParams<T>,
  "method"
>

export type ApiActionRequestParams<T extends Fetcher> = Omit<
  RequestParams<T>,
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
      error?: Error
    }
  )

export type Logger = {
  debug: LogFunction
  error: LogFunction
  trace: LogFunction
  warn: LogFunction
  info: LogFunction
}

export type LogFunction = (...data: unknown[]) => void

export type Fetcher = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>
