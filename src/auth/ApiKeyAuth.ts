import type { ApiKeyAuthOptions, Auth } from "../types.ts"

export class ApiKeyAuth implements Auth {
  private key?: string
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
    this.idHeader = idHeader ?? "x-api-id"
    this.id = id
  }

  createAuthHeaders() {
    return {
      ...(this.key ? { [this.keyHeader]: this.key } : {}),
      ...(this.id ? { [this.idHeader]: this.id } : {}),
    }
  }
}
