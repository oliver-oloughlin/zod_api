import { assert } from "assert"
import { apiClient, apiServer, TEST_ID, TestSchema } from "./deno.config.ts"

Deno.test("server - deno", async (t) => {
  await t.step("Should return test data when provided correct id", async () => {
    const server = apiServer()

    const res = await apiClient.test.get({
      urlParams: {
        id: TEST_ID,
      },
    })

    const parsed = TestSchema.safeParse(res.data)

    assert(res.ok)
    assert(parsed.success)

    await server.shutdown()
  })

  await t.step(
    "Should not return test data when provided incorrect id",
    async () => {
      const server = apiServer()

      const res = await apiClient.test.get({
        urlParams: {
          id: "wrong_id",
        },
      })

      const parsed = TestSchema.safeParse(res.data)

      assert(!res.ok)
      assert(!parsed.success)

      await server.shutdown()
    },
  )
})
