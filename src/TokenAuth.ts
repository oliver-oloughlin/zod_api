import { ZodType } from "zod"
import type { Fetcher, RequestParams } from "./types.ts"
import { InvalidTokenSchemaError } from "./errors.ts"
import { RETRYABLE_STATUS_CODES } from "./utils/status_codes.ts"

export type TokenAuthOptions<T1, T2 extends Fetcher> = {
  tokenUrl: string
  clientId: string
  clientSecret: string
  mapper: (data: T1) => string
  requestParams?: RequestParams<T2>
  tokenValidator?: (data: T1) => boolean
}

export class TokenAuth<T> {
  private schema: ZodType<T>
  private tokenUrl: string
  private basic: string
  private mapper: (data: T) => string
  private requestParams?: RequestParams<Fetcher>
  private tokenValidator?: (data: T) => boolean
  private token?: T

  constructor(schema: ZodType<T>, options: TokenAuthOptions<T, Fetcher>) {
    this.schema = schema
    this.tokenUrl = options.tokenUrl
    this.basic = `Basic ${btoa(`${options.clientId}:${options.clientSecret}`)}`
    this.mapper = options.mapper
    this.requestParams = options.requestParams
    this.tokenValidator = options.tokenValidator
  }

  async createBearer(refresh = false, retries = 3): Promise<string | null> {
    // Check for remaining retry attempts
    if (retries < 1) {
      return null
    }

    // Get current token
    const token = this.token

    // If no token, should refresh or invalid token, then fetch new token
    if (!token || refresh || this.tokenValidator?.(token)) {
      const res = await fetch(this.tokenUrl, {
        method: "POST",
        ...this.requestParams,
        headers: {
          ...this.requestParams?.headers,
          Authorization: this.basic,
        },
      })

      // Check for failed response
      if (!res.ok) {
        if (RETRYABLE_STATUS_CODES.includes(res.status)) {
          return await this.createBearer(false, retries - 1)
        }

        return null
      }

      // Parse token, throw InvalidTokenSchemaError upon unsuccessful parse
      const json = await res.json()
      const parsed = await this.schema.safeParseAsync(json)

      if (!parsed.success) {
        throw new InvalidTokenSchemaError()
      }

      // Set new token and return bearer
      this.token = parsed.data
      return `Bearer ${this.mapper(parsed.data)}`
    }

    // Return bearer
    return `Bearer ${this.mapper(token)}`
  }
}
