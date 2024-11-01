import { createMemoryRouter } from "react-router-dom";
import { it, expect } from "vitest";
import { z } from "zod";

import { createRouter } from "./createRouter.js";

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

it("should apply basename", () => {
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
      basename: "/base",
    }
  );

  expect(ROUTER.state.location.pathname).toBe("/");

  ROUTER["/base/a/:b/c/:d"].path.navigate({ b: "B", d: "D", z: "Z" });
  expect(ROUTER.state.location.pathname + ROUTER.state.location.search).toBe(
    "/base/a/B/c/D?z=Z"
  );
});
