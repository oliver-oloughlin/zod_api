import { z } from "zod"

/**
 * Coerce and parse object data.
 *
 * @param data
 * @param schema
 * @returns
 */
export function safeCoerceObject<T extends z.ZodObject<z.ZodRawShape>>(
  data: unknown,
  schema: T,
): z.SafeParseError<unknown> | z.SafeParseSuccess<z.TypeOf<T>> {
  if (typeof data !== "object") {
    throw Error(`Expected data of type object: Received ${typeof data}`)
  }

  if (schema._def.typeName !== "ZodObject") {
    throw Error(
      `Expected schema of type ZodObject: Received ${schema._def.typeName}`,
    )
  }

  const entries = Object.entries(data as object)

  const parsedEntries = entries
    .map(([key, value]) => {
      const valueSchema = schema.shape[key]

      let parsed = valueSchema?.safeParse(value) ?? z.any().safeParse(value)

      if (!parsed.success) {
        parsed = typeof value === "object" && !(value instanceof Date)
          ? safeCoerceObject(value, valueSchema as z.ZodObject<z.ZodRawShape>)
          : safeCoercePrimitive(value, valueSchema)
      }

      return [key, parsed] as const
    })

  const entry = parsedEntries.find(([_, parsed]) => !parsed.success)

  if (entry) {
    const error = entry[1] as z.SafeParseError<unknown>
    return error
  }

  const coercedSearchParams = Object.fromEntries(
    parsedEntries.map((
      [key, parsed],
    ) => [key, parsed.success ? parsed.data : null]),
  )
  return schema.safeParse(coercedSearchParams)
}

/**
 * Coerce and parse primitive data.
 *
 * @param data - Data to be coerced and parsed according to schema.
 * @param schema - Primitive Zod schema.
 * @returns A parse result or error.
 */
export function safeCoercePrimitive<
  const T extends number | boolean | bigint | string | Date,
>(
  data: unknown,
  schema: z.ZodType<T>,
): z.SafeParseReturnType<unknown, T> {
  // deno-lint-ignore no-explicit-any
  const schemaType = (schema._def as any).typeName

  const coerceSchema = schemaType === "ZodNumber"
    ? z.coerce.number()
    : schemaType === "ZodBoolean"
    ? z.coerce.boolean()
    : schemaType === "ZodBigInt"
    ? z.coerce.bigint()
    : schemaType === "ZodString"
    ? z.coerce.string()
    : schemaType === "ZodDate"
    ? z.coerce.date()
    : null

  // If no coerce schema selected, throw error
  if (!coerceSchema) {
    throw new Error(
      `Expected schema type of (ZodNumber, ZodBoolean, ZodBigInt, ZodString, ZodDate): Received ${schemaType}`,
    )
  }

  // Parse using coerce schema
  const coerceParsed = coerceSchema.safeParse(data)

  // Return error if not successful
  if (!coerceParsed.success) {
    return coerceParsed
  }

  // Return parse result of schema on coerced data
  return schema.safeParse(coerceParsed.data)
}
