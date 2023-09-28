export class InvalidTokenSchemaError extends Error {
  constructor() {
    super("Token schema is invalid - unable to parse token data")
  }
}
