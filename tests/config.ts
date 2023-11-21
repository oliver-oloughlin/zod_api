import { z } from "zod"
import { client, resource } from "../mod.ts"

type Init = Required<Parameters<typeof fetch>>["1"] & {
  test?: string
}

const fetcher = (input: string | URL | Request, init?: Init) =>
  fetch(input, init)

export const pokemonApiClient = client({
  fetcher,
  logger: console,
  baseUrl: "https://pokeapi.co/api/v2",
  resources: {
    pokemon: resource("/pokemon/:name", {
      urlParamsSchema: z.object({
        name: z.string().default("pikachu"),
      }),
      actions: {
        get: {
          dataSchema: z.object({
            id: z.number(),
            name: z.string(),
          }),
          searchParamsSchema: z.object({
            optional: z.string().optional(),
          }),
          headersSchema: z.object({
            "schema-header": z.string(),
          }),
        },
      },
    }),
  },
  defaultRequestParams: {
    headers: {
      "default-header": "default-header",
    },
  },
})
