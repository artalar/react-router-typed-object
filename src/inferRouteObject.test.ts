import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(),
}));

import { useLocation } from "react-router-dom";

import { inferRouteObject } from "./inferRouteObject.js";

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

it("should handle optional search params", () => {
  const ROUTES = inferRouteObject({
    path: "a",
    searchParams: z.object({ q: z.string().optional() }).parse,
  });

  expect(ROUTES["/a"].path({})).toBe("/a");
  expect(ROUTES["/a"].path()).toBe("/a");
});

// Basic useParams tests
it("should retrieve parameters with useParams hook", () => {
  // Setup mocks
  const mockLocation = {
    pathname: "/a/B/c/D",
    search: "?z=Z"
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
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
  
  // Test with no fallback
  const params = ROUTES["/a/:b/c/:d"].path.useParams();
  expect(params).toEqual({ b: "B", d: "D", z: "Z" });
  
  // Test with fallback
  const paramsWithFallback = ROUTES["/a/:b/c/:d"].path.useParams({ q: "Q" });
  expect(paramsWithFallback).toEqual({ b: "B", d: "D", z: "Z", q: "Q" });
});

it("should throw error when required parameters are missing", () => {
  // Setup mocks
  const mockLocation = {
    pathname: "/a//c/", // Missing required parameters
    search: ""
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
  const ROUTES = inferRouteObject({
    path: "a/:b",
    children: [
      {
        path: "c/:d",
      },
    ],
  });
  
  // Should throw error when required parameters are missing
  expect(() => {
    ROUTES["/a/:b/c/:d"].path.useParams();
  }).toThrow("Missing parameter");
  
  // Should not throw error when fallback provides required parameters
  const params = ROUTES["/a/:b/c/:d"].path.useParams({ b: "B", d: "D" });
  expect(params).toEqual({ b: "B", d: "D" });
});

it("should handle optional parameters correctly", () => {
  // Setup mocks
  const mockLocation = {
    pathname: "/a/B/c/", // Missing optional parameter
    search: ""
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
  const ROUTES = inferRouteObject({
    path: "a/:b",
    children: [
      {
        path: "c/:d?", // d is optional
      },
    ],
  });
  
  // Should not throw error when optional parameter is missing
  const params = ROUTES["/a/:b/c/:d?"].path.useParams();
  expect(params).toEqual({ b: "B" });
  
  // Should use fallback for optional parameter
  const paramsWithFallback = ROUTES["/a/:b/c/:d?"].path.useParams({ d: "D" });
  expect(paramsWithFallback).toEqual({ b: "B", d: "D" });
});

// Edge case tests
it("should handle empty parameters when route expects some", () => {
  // Setup mocks with empty parameters
  vi.mocked(useLocation).mockReturnValue({
    pathname: "/users/", // Missing required parameter
    search: ""
  } as any);
  
  const ROUTES = inferRouteObject({
    path: "users/:userId",
  });
  
  // Should throw error when no parameters are provided
  expect(() => {
    ROUTES["/users/:userId"].path.useParams();
  }).toThrow("Missing parameter");
  
  // Should use fallback when provided
  const params = ROUTES["/users/:userId"].path.useParams({ userId: "default-user" });
  expect(params).toEqual({ userId: "default-user" });
});

it("should handle invalid search parameters", () => {
  // Setup mocks
  const mockLocation = {
    pathname: "/products/123",
    search: "?minPrice=invalid" // Invalid search parameter (should be a number)
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
  const ROUTES = inferRouteObject({
    path: "products/:productId",
    searchParams: z.object({
      minPrice: z.number(), // Expecting a number
      maxPrice: z.number().optional(),
    }).parse,
  });
  
  // Should throw error when search parameters fail validation
  expect(() => {
    ROUTES["/products/:productId"].path.useParams();
  }).toThrow();
  
  // Should use fallback when provided
  const params = ROUTES["/products/:productId"].path.useParams({
    minPrice: 10,
    maxPrice: 100
  });
  expect(params).toEqual({
    productId: "123",
    minPrice: 10,
    maxPrice: 100
  });
});

it("should handle complex nested routes with multiple parameters", () => {
  // Setup mocks for a complex route
  const mockLocation = {
    pathname: "/organizations/org-123/projects/proj-456/tasks/task-789",
    search: "?assignee=user-123&priority=high"
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
  const ROUTES = inferRouteObject({
    path: "organizations/:orgId",
    children: [
      {
        path: "projects/:projectId",
        children: [
          {
            path: "tasks/:taskId",
            searchParams: z.object({
              assignee: z.string(),
              priority: z.enum(["low", "medium", "high"]),
              dueDate: z.string().optional(),
            }).parse,
          },
        ],
      },
    ],
  });
  
  // Should correctly parse all parameters
  const params = ROUTES["/organizations/:orgId/projects/:projectId/tasks/:taskId"].path.useParams();
  expect(params).toEqual({
    orgId: "org-123",
    projectId: "proj-456",
    taskId: "task-789",
    assignee: "user-123",
    priority: "high",
  });
  
  // Should merge with fallback
  const paramsWithFallback = ROUTES["/organizations/:orgId/projects/:projectId/tasks/:taskId"].path.useParams({
    dueDate: "2023-12-31",
  });
  expect(paramsWithFallback).toEqual({
    orgId: "org-123",
    projectId: "proj-456",
    taskId: "task-789",
    assignee: "user-123",
    priority: "high",
    dueDate: "2023-12-31",
  });
});

it("should handle special characters in parameters", () => {
  // Setup mocks with special characters
  const mockLocation = {
    pathname: "/users/user%2Fwith%2Fslashes/section%23with%23hashes",
    search: "?query=special+characters&filter=a%26b"
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
  const ROUTES = inferRouteObject({
    path: "users/:userId",
    children: [
      {
        path: ":section",
        searchParams: z.object({
          query: z.string(),
          filter: z.string().optional(),
        }).parse,
      },
    ],
  });
  
  // Should correctly handle special characters
  const params = ROUTES["/users/:userId/:section"].path.useParams();
  expect(params).toEqual({
    userId: "user/with/slashes",    // Our implementation decodes URL-encoded characters
    section: "section#with#hashes", // Our implementation decodes URL-encoded characters
    query: "special characters",    // URLSearchParams decodes the values
    filter: "a&b",                  // URLSearchParams decodes the values
  });
});

it("should handle empty search string when search parameters are expected", () => {
  // Setup mocks with empty search string
  const mockLocation = {
    pathname: "/categories/electronics",
    search: "" // Empty search string
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
  const ROUTES = inferRouteObject({
    path: "categories/:categoryId",
    searchParams: z.object({
      sort: z.string().optional(),
      filter: z.string().optional(),
    }).parse,
  });
  
  // Should not throw error when search string is empty but parameters are optional
  const params = ROUTES["/categories/:categoryId"].path.useParams();
  expect(params).toEqual({ categoryId: "electronics" });
  
  // Should merge with fallback
  const paramsWithFallback = ROUTES["/categories/:categoryId"].path.useParams({
    sort: "price-asc",
    filter: "in-stock",
  });
  expect(paramsWithFallback).toEqual({
    categoryId: "electronics",
    sort: "price-asc",
    filter: "in-stock",
  });
});

it("should prioritize URL parameters over fallback values", () => {
  // Setup mocks
  const mockLocation = {
    pathname: "/users/actual-user",
    search: "?role=admin"
  };
  
  vi.mocked(useLocation).mockReturnValue(mockLocation as any);
  
  const ROUTES = inferRouteObject({
    path: "users/:userId",
    searchParams: z.object({
      role: z.string(),
    }).parse,
  });
  
  // URL parameters should take precedence over fallback
  const params = ROUTES["/users/:userId"].path.useParams({
    userId: "fallback-user",
    role: "fallback-role",
  });
  
  expect(params).toEqual({
    userId: "actual-user", // From URL, not fallback
    role: "admin",         // From URL, not fallback
  });
});
