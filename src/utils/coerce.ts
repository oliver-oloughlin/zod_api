import { z } from "zod"

/**
 * Coerce and parse a Zod schema of any primitive type.
 *
 * @param value - Value to be coerced and parsed according to schema.
 * @param schema - Primitive Zod schema.
 * @returns A parse result or error.
 */
export function parseCoercedPrimitive<const T extends z.ZodType>(
  value: unknown,
  schema: T,
): z.SafeParseSuccess<T> | { success: false } {
  // Get schema type
  const type = typeof schema._type

  // Select appropriate coerce schema
  const coerceSchema = type === "number"
    ? z.coerce.number()
    : type === "boolean"
    ? z.coerce.boolean()
    : type === "bigint"
    ? z.coerce.bigint()
    : type === "string"
    ? z.coerce.string()
    : null

  // If no coerce schema selected, return error
  if (!coerceSchema) {
    return {
      success: false,
    }
  }

  // Parse using coerce schema
  const coerceParsed = coerceSchema.safeParse(value)

  // Return error if not successful
  if (!coerceParsed.success) {
    return coerceParsed
  }

  // Return parse result of schema on coerced data
  return schema.safeParse(coerceParsed.data)
}
