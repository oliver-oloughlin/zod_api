import type { ApiKeyAuthOptions, Auth } from "../types.ts"

/**
 * Authentication using API key
 *
 * @example
 * ```ts
 * import { client, ApiKeyAuth } from "zod-api"
 *
 * const apiClient = client({
 *   baseUrl: "...",
 *   auth: new ApiKeyAuth({ key: "{api_key}" }),
 *   resources: {...}
 * })
 * ```
 *
 * @example
 * ```ts
 * import { client, ApiKeyAuth } from "zod-api"
 *
 * const apiClient = client({
 *   baseUrl: "...",
 *
 *   // Set app id and custom headers
 *   auth: new ApiKeyAuth({
 *     key: "{api_key}"
 *     keyHeader: "x-api-key",
 *     id: "{app_id}",
 *     idHeader: "x-app-id"
 *   }),
 *
 *   resources: {...}
 * })
 * ```
 */
export class ApiKeyAuth implements Auth {
  private key: string
  private keyHeader: string
  private idHeader: string
  private id?: string

  constructor({
    key,
    keyHeader,
    id,
    idHeader,
  }: ApiKeyAuthOptions) {
    this.key = key
    this.keyHeader = keyHeader ?? "x-api-key"
    this.idHeader = idHeader ?? "x-app-id"
    this.id = id
  }

  createAuthHeaders(): HeadersInit {
    return {
      [this.keyHeader]: this.key,
      ...(this.id ? { [this.idHeader]: this.id } : {}),
    }
  }
}
