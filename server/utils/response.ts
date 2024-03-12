// Types
type ResponseInitilizer = (
  body?: BodyInit | null,
  init?: ResponseInit,
) => Response

type RedirectInitializer = (url: URL | string) => Response

// Success responses
export const ok: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 200,
  })
}

export const created: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 201,
  })
}

// Redirect responses
export const movedPermanently: RedirectInitializer = (url) =>
  Response.redirect(url, 301)

export const found: RedirectInitializer = (url) => Response.redirect(url, 302)

export const temporaryRedirect: RedirectInitializer = (url) =>
  Response.redirect(url, 307)

export const permanentRedirect: RedirectInitializer = (url) =>
  Response.redirect(url, 308)

// Error responses
export const badRequest: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 400,
  })
}

export const unauthorized: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 401,
  })
}

export const forbidden: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 403,
  })
}

export const notFound: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 404,
  })
}

export const methodNotAllowed: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 405,
  })
}

export const internalServerError: ResponseInitilizer = (body, init) => {
  return base(body, {
    ...init,
    status: 500,
  })
}

// Helpers
const base: ResponseInitilizer = (body, init) => {
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
