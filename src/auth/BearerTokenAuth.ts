import { ZodType } from "zod"
import type {
  Auth,
  BearerTokenAuthOptions,
  Fetcher,
  RequestParams,
} from "../types.ts"
import { InvalidTokenSchemaError } from "../errors.ts"
import { RETRYABLE_STATUS_CODES } from "../utils/status_codes.ts"

export class BearerTokenAuth<T> implements Auth {
  private schema: ZodType<T>
  private tokenUrl: string
  private basic: string
  private mapper: (data: T) => string
  private requestParams?: RequestParams<Fetcher>
  private tokenValidator?: (data: T) => boolean
  private token?: T

  constructor(schema: ZodType<T>, options: BearerTokenAuthOptions<T, Fetcher>) {
    this.schema = schema
    this.tokenUrl = options.tokenUrl
    this.basic = `Basic ${btoa(`${options.clientId}:${options.clientSecret}`)}`
    this.mapper = options.mapper
    this.requestParams = options.requestParams
    this.tokenValidator = options.tokenValidator
  }

  async createAuthHeaders(refresh = false, retries = 3): Promise<HeadersInit> {
    // Check for remaining retry attempts
    if (retries < 1) {
      return {}
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
          return await this.createAuthHeaders(false, retries - 1)
        }

        return {}
      }

      // Parse token, throw InvalidTokenSchemaError upon unsuccessful parse
      const json = await res.json()
      const parsed = await this.schema.safeParseAsync(json)

      if (!parsed.success) {
        throw new InvalidTokenSchemaError()
      }

      // Set new token and return bearer
      this.token = parsed.data
      return {
        Authorization: `Bearer ${this.mapper(parsed.data)}`,
      }
    }

    // Return bearer
    return {
      Authorization: `Bearer ${this.mapper(token)}`,
    }
  }
}
