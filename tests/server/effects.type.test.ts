import { z } from "zod"
import { type Brand, make } from "https://deno.land/x/ts_brand@0.0.1/mod.ts"
import { client } from "../../src/client.ts"
import { resource } from "../../src/resource.ts"
import { assertType, type IsExact } from "jsr:@std/testing/types"

// This example bases on usecase that I couldn't use custom+transforms in
// In real-world scenario there's another layer that adds `Bearer ...` and brands it as a header value, I've skipped it here
// Current version doesn't offer typeguards for transform (not sure how to approach it), custom is handled automagically
// It allows you to use your current typeguarded schemas without typeerrors

type UserToken = Brand<string, "UserToken">
const makeUserToken = (userToken: string) => make<UserToken>()(userToken)
const userTokenSchema = z.string().transform(makeUserToken)
const userAuthHeaderSchema = z.object({
  Authorization: userTokenSchema,
})
const userTokenSchema2 = z
  .custom<UserToken>((x) => typeof x === "string")
  .transform(makeUserToken)
const userAuthHeaderSchema_USING_CUSTOM = z.object({
  Authorization: userTokenSchema2,
})

type AppToken = Brand<string, "AppToken">
const makeAppToken = (appToken: string) => make<AppToken>()(appToken)
const appTokenSchema = z.string().transform(makeAppToken)
const appAuthHeaderSchema = z.object({
  Authorization: appTokenSchema,
})

// Let's pretend this API just takes Authorization as every option and responds with Authorization
const api = client({
  fetcher: () => Promise.resolve(new Response("mock")),
  baseUrl: "test",
  resources: {
    endpointForUsers: resource("/user/header/echo", {
      actions: {
        get: {
          dataSchema: userAuthHeaderSchema,
          headersSchema: userAuthHeaderSchema,
          searchParamsSchema: userAuthHeaderSchema,
        },
        post: {
          dataSchema: userAuthHeaderSchema,
          headersSchema: userAuthHeaderSchema,
          bodySchema: userAuthHeaderSchema,
          searchParamsSchema: userAuthHeaderSchema,
        },
        delete: {
          bodySchema: userAuthHeaderSchema_USING_CUSTOM,
          dataSchema: userAuthHeaderSchema_USING_CUSTOM,
          headersSchema: userAuthHeaderSchema_USING_CUSTOM,
          searchParamsSchema: userAuthHeaderSchema_USING_CUSTOM,
        },
        options: {
          bodySchema: userAuthHeaderSchema,
          dataSchema: userAuthHeaderSchema,
          headersSchema: userAuthHeaderSchema,
          searchParamsSchema: userAuthHeaderSchema,
        },
        patch: {
          bodySchema: userAuthHeaderSchema,
          dataSchema: userAuthHeaderSchema,
          headersSchema: userAuthHeaderSchema,
          searchParamsSchema: userAuthHeaderSchema,
        },
        put: {
          bodySchema: userAuthHeaderSchema,
          dataSchema: userAuthHeaderSchema,
          headersSchema: userAuthHeaderSchema,
          searchParamsSchema: userAuthHeaderSchema,
        },
      },
    }),
    endpointForApp: resource("/app/header/echo", {
      actions: {
        get: {
          dataSchema: appAuthHeaderSchema,
          headersSchema: appAuthHeaderSchema,
          searchParamsSchema: appAuthHeaderSchema,
        },
        post: {
          dataSchema: appAuthHeaderSchema,
          headersSchema: appAuthHeaderSchema,
          bodySchema: appAuthHeaderSchema,
          searchParamsSchema: appAuthHeaderSchema,
        },
        delete: {
          bodySchema: appAuthHeaderSchema,
          dataSchema: appAuthHeaderSchema,
          headersSchema: appAuthHeaderSchema,
          searchParamsSchema: appAuthHeaderSchema,
        },
        options: {
          bodySchema: appAuthHeaderSchema,
          dataSchema: appAuthHeaderSchema,
          headersSchema: appAuthHeaderSchema,
          searchParamsSchema: appAuthHeaderSchema,
        },
        patch: {
          bodySchema: appAuthHeaderSchema,
          dataSchema: appAuthHeaderSchema,
          headersSchema: appAuthHeaderSchema,
          searchParamsSchema: appAuthHeaderSchema,
        },
        put: {
          bodySchema: appAuthHeaderSchema,
          dataSchema: appAuthHeaderSchema,
          headersSchema: appAuthHeaderSchema,
          searchParamsSchema: appAuthHeaderSchema,
        },
      },
    }),
  },
})

const appToken = makeAppToken("appToken")
const userToken = makeUserToken("userToken")

Deno.test("Call with branding types", async () => {
  const a = await api.endpointForUsers.delete({
    body: { Authorization: userToken },
    headers: { Authorization: userToken },
    searchParams: { Authorization: userToken },
  })

  assertType<
    IsExact<
      typeof a.data,
      {
        Authorization: UserToken
      } | null
    >
  >(true)
})

Deno.test("Expect type error when using incorrect branded type", () => {
  // dryrun, test will fail to build if it ever doesn't produce an error
  api.endpointForUsers.delete({
    // @ts-expect-error this should be userToken, appToken should be catched by typeguard
    body: { Authorization: appToken },
    // @ts-expect-error this should be userToken, appToken should be catched by typeguard
    headers: { Authorization: appToken },
    // @ts-expect-error this should be userToken, appToken should be catched by typeguard
    searchParams: { Authorization: appToken },
  })
})

Deno.test("Expect type error when not using brands when brands are required", () => {
  // dryrun, test will fail to build if it ever doesn't produce an error
  api.endpointForUsers.delete({
    // @ts-expect-error this should be userToken, string should be catched by typeguard
    body: { Authorization: "Bearer something" },
    // @ts-expect-error this should be userToken, string should be catched by typeguard
    headers: { Authorization: "Bearer something" },
    // @ts-expect-error this should be userToken, string should be catched by typeguard
    searchParams: { Authorization: "Bearer something" },
  })
})

Deno.test("Typecheck custom", () => {
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.delete
      >[0]["body"]["Authorization"],
      UserToken
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.delete
      >[0]["headers"]["Authorization"],
      UserToken
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.delete
      >[0]["searchParams"]["Authorization"],
      UserToken
    >
  >(true)
})

Deno.test("Typecheck transfrom", () => {
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.options
      >[0]["body"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.options
      >[0]["headers"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.options
      >[0]["searchParams"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.patch
      >[0]["body"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.patch
      >[0]["headers"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.patch
      >[0]["searchParams"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.post
      >[0]["body"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.post
      >[0]["headers"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.post
      >[0]["searchParams"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.put
      >[0]["body"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.put
      >[0]["headers"]["Authorization"],
      string
    >
  >(true)
  assertType<
    IsExact<
      Parameters<
        typeof api.endpointForUsers.put
      >[0]["searchParams"]["Authorization"],
      string
    >
  >(true)
})
