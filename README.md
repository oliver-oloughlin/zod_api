# zod_api

Configure strongly typed API clients and endpoints using Zod schemas.

## Client

```ts
import { client, resource } from "zod_api"

const apiClient = client({
  baseUrl: "https://someapi.com/v1",
  resources: {
    foo: resource("/foo", {
      actions: {
        get: {
          dataSchema: z.object({
            bar: z.string(),
            baz: z.number(),
          }),
        },
      },
    }),
    bar: resource("/bar/:id", {
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

Action methods are inferred and explorable through auto-complete:

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
import {
  ApiKeyAuth,
  BasicAuth,
  BearerTokenAuth,
  client,
  resource,
} from "./mod.ts"

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
const spotifyApiClient = client({
  baseUrl: "https://api.spotify.com/v1",
  logger: console,
  fetcher: fetch,

  // Setup authentication headers directly
  requestParams: {
    headers: {
      "x-api-key": "{api_key}",
    },
  },

  // API key authentication
  auth: new ApiKeyAuth({ key: "{api_key}" }),

  // Basic authentication
  auth: new BasicAuth({
    id: "{api_id}",
    secret: "{api_secret}",
  }),

  // Bearer token authentication
  auth: new BearerTokenAuth(AccessTokenSchema, {
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
    artists: resource("/artists/:id", {
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

## Server

Create a server with strongly typed endpoints:

```ts
import { resource, server } from "zod_api"

server({
  // Set options (optional)
  options: {
    hostname: "localhost",
    port: 3000
  },

  // Create middleware (optional)
  middleware: (req) => console.log(req.url)

  // Define resources
  resources: {
    foo: resource("/foo/:id", {
      urlParamsSchema: z.object({
        id: z.string(),
      }),
      actions: {
        get: {
          searchParams: z.object({
            q: z.number(),
          }),
          dataSchema: z.object({
            bar: z.string(),
            baz: z.number(),
          })
        }
      }
    })
  }
}, {
  foo: {
    // ctx contains parsed body, headers, url and search parameters.
    get: (req, ctx) => {
      // Return successful response
      return {
        ok: true,
        data: {
          bar: ctx.urlParams.id,
          baz: ctx.searchParams.q,
        }
      }

      // or return error
      return {
        ok: false,
        status: 401,
        message: "Unauthorized"
      }
    }
  }
})
```

## Client & Server

When you want to configure both the client and the server for maximum
synchronization, you can do it the following way:

```ts
import { client, config, resource, server } from "zod_api"

// in config.ts
const apiConfig = config({
  resources: {
    foo: resource("/foo", {
      // ...
    }),
  },
})

// in client.ts
const apiClient = client({
  ...apiConfig,
  baseUrl: "https://apihost.com",
})

// in server.ts
server({
  ...apiConfig,
}, {
  foo: {
    // ...
  },
})
```
