import { assert } from "assert"
import { apiClient, PokemonSchema } from "./client.config.ts"

Deno.test("client", async (t) => {
  await t.step("Should get pokemon by id", async () => {
    const res = await apiClient.pokemon.get({
      urlParams: {
        id: "pikachu",
      },
    })

    const parsed = PokemonSchema.safeParse(res.data)

    assert(res.ok)
    assert(parsed.success)
  })
})
