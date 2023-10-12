export type ResponseInitializer = (
  body?: BodyInit,
  init?: ResponseInit,
) => Response

// Success repsonses
export const ok: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 200,
  })
}

export const created: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 201,
  })
}

// Error responses
export const badRequest: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 400,
  })
}

export const unauthorized: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 401,
  })
}

export const forbidden: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 403,
  })
}

export const notFound: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 404,
  })
}

export const methodNotAllowed: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 405,
  })
}

export const internalServerError: ResponseInitializer = (body, init) => {
  return base(body, {
    ...init,
    status: 500,
  })
}

// Helpers
const base: ResponseInitializer = (body, init) => {
  const headers = init?.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : init?.headers
  return new Response(body, {
    ...init,
    headers: {
      ...headers,
      "Access-Control-Allow-Origin": "*",
    },
  })
}
