import { z, ZodType } from "zod"

export function zodCoerce(schema: ZodType) {
  const type = schema._type
  const typeOf = typeof schema._type

  switch (typeOf) {
    case "number": {
      return z.coerce.number()
    }
    case "bigint": {
      return z.coerce.bigint()
    }
    case "boolean": {
      return z.coerce.bigint()
    }
    case "object": {
      if (type instanceof Date) {
        return z.coerce.date()
      }
    }
  }

  return schema
}
