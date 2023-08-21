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
