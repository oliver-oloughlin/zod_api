import type {
  ApiConfig,
  ApiResourceConfig,
  Logger,
  Path,
  PathlessApiResourceConfig,
} from "../src/types.ts"
import type { TypeOf, ZodType } from "zod"

export type DenoApiServerConfig = ApiConfig & {
  logger?: Logger
  options?: Omit<Deno.ServeOptions, "onError">
  middleware?: Middleware
}

export type HonoApiServerConfig = ApiConfig & {
  logger?: Logger
}

export type ApiServerHandlers<T extends ApiConfig> = {
  [K in keyof T["resources"]]: ApiServerResourceHandlers<T["resources"][K]>
}

export type ApiServerResourceHandlers<
  T extends ApiResourceConfig<Path, PathlessApiResourceConfig<Path>>,
> = {
  [K in keyof T["actions"]]: (
    req: Request,
    ctx: ApiActionHandlerContext<T["actions"][K], T>,
  ) =>
    | ApiActionHandlerResult<T["actions"][K]>
    | Promise<ApiActionHandlerResult<T["actions"][K]>>
}

export type ApiActionHandlerContext<T1, T2> =
  & (T1 extends { bodySchema: ZodType } ? { body: TypeOf<T1["bodySchema"]> }
    : Record<string, never>)
  & (T1 extends { searchParamsSchema: ZodType }
    ? { searchParams: TypeOf<T1["searchParamsSchema"]> }
    : Record<string, never>)
  & (T1 extends { headersSchema: ZodType }
    ? { headers: TypeOf<T1["headersSchema"]> }
    : Record<string, never>)
  & (T2 extends { urlParamsSchema: ZodType }
    ? { urlParams: TypeOf<T2["urlParamsSchema"]> }
    : Record<string, never>)

export type ApiActionHandlerResult<T> =
  | (T extends { dataSchema: ZodType } ? {
      ok: true
      data: TypeOf<T["dataSchema"]>
    }
    : {
      ok: true
      data?: never
    })
  | {
    ok: false
    status: number
    message?: string
  }

export type Middleware = (req: Request) => Response | Promise<Response> | void

export type PreparedResourceHandler = {
  resourceConfig: ApiResourceConfig<any, any>
  resourceHandlers: ApiServerResourceHandlers<any>
}
