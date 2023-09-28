export const RETRYABLE_STATUS_CODES = [429, 500]

export const AUTHENTICATION_ERROR_STATUS_CODES = [401, 403]

export enum ZodApiStatusCode {
  UncaughtClientError = 600,
  DataParseError = 601,
}
