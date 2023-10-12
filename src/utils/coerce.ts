import { z } from "zod"

export function parseCoercedPrimitive<const T extends z.ZodType>(
  value: unknown,
  schema: T,
): z.SafeParseSuccess<T> | { success: false } {
  const type = typeof schema._type

  const coerceSchema = type === "number"
    ? z.coerce.number()
    : type === "boolean"
    ? z.coerce.boolean()
    : type === "bigint"
    ? z.coerce.bigint()
    : type === "string"
    ? z.coerce.string()
    : null

  if (!coerceSchema) {
    return {
      success: false,
    }
  }

  const coerceParsed = coerceSchema.safeParse(value)

  if (!coerceParsed.success) {
    return coerceParsed
  }

  return schema.safeParse(coerceParsed.data)
}
