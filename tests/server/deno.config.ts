import { z } from "zod"
import { config, resource } from "../../mod.ts"
import { serve } from "../../server/deno.ts"
import { client } from "../../mod.ts"

export const TestSchema = z.object({
  foo: z.string(),
  bar: z.number(),
})

export const TEST_ID = "test_id"

const apiConfig = config({
  resources: {
    test: resource("/test/:id", {
      urlParamsSchema: z.object({
        id: z.string(),
      }),
      actions: {
        get: {
          dataSchema: TestSchema,
        },
      },
    }),
  },
})

export const apiClient = client({
  baseUrl: "http://localhost:8000",
  ...apiConfig,
})

export function apiServer() {
  return serve({
    ...apiConfig,
    options: {
      onListen: () => {},
    },
  }, {
    test: {
      get(_, ctx) {
        const id = ctx.urlParams.id

        if (id !== TEST_ID) {
          return {
            ok: false,
            status: 404,
          }
        }

        return {
          ok: true,
          data: {
            foo: "foo",
            bar: 10,
          },
        }
      },
    },
  })
}
