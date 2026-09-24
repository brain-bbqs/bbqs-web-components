// Response-shaped stubs for unit tests of the archive client and the apps' code over it. Plain
// objects rather than real Response instances so a test can hand back an unreadable body, a
// rejected json(), or a status the constructor would refuse.

/** A response carrying a JSON body. `ok` follows the status unless overridden. */
export function jsonResponse(body: unknown, status = 200, ok: boolean = status >= 200 && status < 300): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

/** A response carrying a text body, whose json() fails the way a non-JSON body's would. */
export function textResponse(body: string, status = 200, ok: boolean = status >= 200 && status < 300): Response {
  return {
    ok,
    status,
    json: () => Promise.reject(new SyntaxError("Unexpected token")),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

export interface FetchRoute {
  /** Matches a request URL: a substring, a RegExp, or a predicate. */
  match: string | RegExp | ((url: string, init?: RequestInit) => boolean);
  /** The response, or a function building one from the request. */
  respond: Response | ((url: string, init?: RequestInit) => Response | Promise<Response>);
}

export interface FetchRouter {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
  /** Every call made, in order. */
  calls: { url: string; init?: RequestInit }[];
  /** Calls whose URL contains `fragment`. */
  callsTo(fragment: string): { url: string; init?: RequestInit }[];
}

function matches(route: FetchRoute, url: string, init?: RequestInit): boolean {
  if (typeof route.match === "string") return url.includes(route.match);
  if (route.match instanceof RegExp) return route.match.test(url);
  return route.match(url, init);
}

/**
 * A fetch replacement routing each call to the first matching route, recording every call. A call
 * no route matches rejects like a network failure, so a test cannot silently reach the network.
 *
 * ```ts
 * const fetchMock = routeFetch([
 *   { match: "/users/me/", respond: jsonResponse({ username: "ada" }) },
 *   { match: /\/admin-owned\//, respond: (url) => jsonResponse({ adminOwned: url.endsWith("000123") }) },
 * ]);
 * vi.stubGlobal("fetch", fetchMock);
 * ```
 */
export function routeFetch(routes: FetchRoute[]): FetchRouter {
  const calls: { url: string; init?: RequestInit }[] = [];
  const router = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    const route = routes.find((r) => matches(r, url, init));
    if (!route) throw new TypeError(`Failed to fetch (no route for ${url})`);
    return typeof route.respond === "function" ? route.respond(url, init) : route.respond;
  }) as FetchRouter;
  router.calls = calls;
  router.callsTo = (fragment) => calls.filter((c) => c.url.includes(fragment));
  return router;
}
