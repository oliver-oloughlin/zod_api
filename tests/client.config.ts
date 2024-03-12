import { z } from "zod"
import { client, resource } from "../mod.ts"

export const PokemonSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  base_experience: z.number().int(),
  height: z.number().int(),
  is_default: z.boolean(),
  order: z.number().int(),
})

export const apiClient = client({
  baseUrl: "https://pokeapi.co/api/v2",
  resources: {
    pokemon: resource("/pokemon/{id}", {
      urlParamsSchema: z.object({
        id: z.string().or(z.number()),
      }),
      actions: {
        get: {
          dataSchema: PokemonSchema,
        },
      },
    }),
  },
})
