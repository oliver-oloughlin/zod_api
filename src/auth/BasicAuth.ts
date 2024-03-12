import type { Auth, BasicAuthOptions } from "../types.ts"

export class BasicAuth implements Auth {
  private id: string
  private secret: string

  constructor({ id, secret }: BasicAuthOptions) {
    this.id = id
    this.secret = secret
  }

  createAuthHeaders(): HeadersInit {
    return {
      Authorization: `Basic ${btoa(`${this.id}:${this.secret}`)}`,
    }
  }
}
