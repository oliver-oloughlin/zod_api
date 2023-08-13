# zod_api

Configure API clients using Zod schemas for type-safety and interpreted resource
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
    baz: zodApiResource("/baz/:id", {
      // URL parameters schema is enforced from the given path
      urlParamsSchema: z.object({
        id: z.number(),
      }),
      actions: {
        get: {
          searchParamsSchema: z.object({
            q: z.string().optional(),
          }),
          headersSchema: z.object({
            "x-key": z.string(),
            "x-secret": z.string(),
          }),
          dataSchema: z.object({
            foo: z.string(),
            bar: z.number(),
          }),
        },
      },
    }),
  },
})
```

This configuration gives these auto-complete examples:

![Resources](/images/auto_complete_1.png)

![Actions](/images/auto_complete_2.png)

![Parameters](/images/auto_complete_3.png)
