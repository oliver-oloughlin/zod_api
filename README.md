# zod_api

Configure API clients using Zod schemas for type enforcement and interpreted
action methods.

## Api Client

```ts
import { zodApiClient, zodApiResource } from "zod_api"

const apiClient = zodApiClient({
  baseUrl: "https://someapi.com/v1",
  resources: {
    foo: zodApiResource("/foo", {
      actions: {
        get: {
          dataSchema: z.object({
            bar: z.string(),
            baz: z.number(),
          }),
        },
      },
    }),
    bar: zodApiResource("/bar/:id", {
      // URL parameters schema is enforced by the given path, /baz/[id] pattern is also supported
      urlParamsSchema: z.object({
        id: z.number(),
      }),
      actions: {
        post: {
          searchParamsSchema: z.object({
            q: z.string().optional(),
          }),
          bodySchema: z.object({
            field1: z.string(),
            field2: z.number(),
          }),
          headersSchema: z.object({
            "x-key": z.string(),
            "x-secret": z.string(),
          }),
        },
      },
    }),
  },
})
```

Action methods are inferred and explorable thorugh auto-complete:

```ts
const response1 = await apiClient.foo.get()

const resposne2 = await apiClient.bar.post({
  urlParams: {
    id: 123,
  },
  searchParams: {
    q: "query",
  },
  body: {
    field1: "some string",
    field2: 42,
  },
  headers: {
    "x-key": "key",
    "x-secret": "secret",
  },
})
```

Setup authentication:

```ts
import { z } from "zod"
import { TokenAuth, zodApiClient, zodApiResource } from "./mod.ts"

// Schemas
const ArtistSchema = z.object({
  genres: z.array(z.string()),
  href: z.string(),
  id: z.string(),
  name: z.string(),
  popularity: z.number(),
  type: z.enum(["artist"]),
  uri: z.string(),
})

const AccessTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.enum(["Bearer"]),
  expires_in: z.number(),
})

// Spotify API Client
const spotifyApiClient = zodApiClient({
  baseUrl: "https://api.spotify.com/v1",
  logger: console,
  fetcher: fetch,

  // Setup normal header authentication
  requestParams: {
    headers: {
      "x-api-key": "{api_key}",
      "x-api-secret": "{api_secret}",
    },
  },

  // ... Or setup bearer token authentication
  auth: new TokenAuth(AccessTokenSchema, {
    tokenUrl: "https://accounts.spotify.com/api/token",
    clientId: "{client_id}",
    clientSecret: "{client_secret}",
    mapper: (token) => token.access_token,
    requestParams: {
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    },
  }),

  // Define resources
  resources: {
    artist: zodApiResource("/artists/:id", {
      urlParamsSchema: z.object({
        id: z.string(),
      }),
      actions: {
        get: {
          dataSchema: ArtistSchema,
        },
      },
    }),
  },
})
```
