import { createMemoryRouter } from "react-router-dom";
import { it, describe, expect } from "vitest";
import { z } from "zod";

import { createRouter } from "./createRouter.js";
import { inferRouteObject } from "./inferRouteObject.js";

describe("inferRouteObject", () => {
  it("should infer the list of all nested paths", () => {
    const ROUTES = inferRouteObject({
      path: "a",
      children: [
        { path: "b" },
        {
          path: "c",
          children: [{ children: [{ children: [{ path: "d" }] }] }],
        },
      ],
    });

    expect(ROUTES["/a"].path.pattern).toBe("/a");
    expect(ROUTES["/a/b"].path.pattern).toBe("/a/b");
    expect(ROUTES["/a/c"].path.pattern).toBe("/a/c");
    expect(ROUTES["/a/c/d"].path.pattern).toBe("/a/c/d");
  });

  it("should handle path params", () => {
    const ROUTES = inferRouteObject({
      path: "a/:b",
      children: [{ path: "c/:d" }],
    });

    expect(ROUTES["/a/:b/c/:d"].path({ b: "B", d: "D" })).toBe("/a/B/c/D");
  });

  it("should handle search params", () => {
    const ROUTES = inferRouteObject({
      path: "a/:b",
      children: [
        {
          path: "c/:d",
          searchParams: z.object({
            z: z.string(),
            q: z.string().optional(),
          }).parse,
        },
      ],
    });

    expect(ROUTES["/a/:b/c/:d"].path({ b: "B", d: "D", z: "Z" })).toBe(
      "/a/B/c/D?z=Z"
    );
    expect(
      ROUTES["/a/:b/c/:d"].path({ b: "B", d: "D", z: "Z", q: undefined })
    ).toBe("/a/B/c/D?z=Z");
    expect(ROUTES["/a/:b/c/:d"].path({ b: "B", d: "D", z: "Z", q: "Q" })).toBe(
      "/a/B/c/D?z=Z&q=Q"
    );
  });

  it("should handle both optional params and search params", () => {
    const ROUTES = inferRouteObject({
      path: "a",
      children: [
        {
          path: ":b/c/:d?",
          searchParams: z.object({ z: z.string() }).parse,
        },
        {
          path: "e",
          children: [
            {
              path: ":f?",
              searchParams: z.object({ z: z.string() }).parse,
            },
          ],
        },
      ],
    });

    expect(ROUTES["/a/:b/c/:d?"].path({ b: "B", d: "D", z: "Z" })).toBe(
      "/a/B/c/D?z=Z"
    );
    expect(ROUTES["/a/:b/c/:d?"].path({ b: "B", z: "Z" })).toBe("/a/B/c/?z=Z");
    expect(ROUTES["/a/e/:f?"].path({ z: "Z" })).toBe("/a/e/?z=Z");
    expect(ROUTES["/a/e/:f?"].path({ f: "F", z: "Z" })).toBe("/a/e/F?z=Z");
  });
});

describe("createRouter", () => {
  it("should apply navigation to the history", () => {
    const ROUTER = createRouter(
      [
        {
          path: "a",
          children: [
            {
              path: ":b/c/:d",
              searchParams: z.object({ z: z.string() }).parse,
            },
          ],
        },
      ],
      {
        createRouter: createMemoryRouter,
      }
    );

    expect(ROUTER.state.location.pathname).toBe("/");

    ROUTER["/a/:b/c/:d"].path.navigate({ b: "B", d: "D", z: "Z" });
    expect(ROUTER.state.location.pathname + ROUTER.state.location.search).toBe(
      "/a/B/c/D?z=Z"
    );
  });
});
