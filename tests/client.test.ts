import { assert } from "./deps.ts"
import { pokemonApiClient } from "./config.ts"

Deno.test("get", async (t) => {
  await t.step("Should successfully get ditto pokemon data", async () => {
    const res = await pokemonApiClient.pokemon.get({
      urlParams: {
        name: "ditto",
      },
      headers: {
        "schema-header": "schema-header",
      },
    })

    assert(res.ok)
    assert(res.data.name === "ditto")
  })
})
