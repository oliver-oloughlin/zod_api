import { client, config, resource, server } from "./mod.ts"

// in config.ts
const apiConfig = config({
  resources: {
    foo: resource("/foo", {
      actions: {
        get: {},
      },
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
    get: () => ({ ok: true }),
  },
})
