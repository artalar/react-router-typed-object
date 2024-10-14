# React Router Typed Object

Bringing full typesafety to your React Router configurations

## Introduction

**React Router Typed Object** is a helper library for [React Router](https://reactrouter.com) that brings complete typesafety to your route configurations. It enables you to define your routes in a way that TypeScript can infer all the necessary types, ensuring that all router references are consistent and safe across your codebase. This is especially beneficial in large applications with complex routing structures, where maintaining typesafety can greatly reduce errors and improve developer productivity.

By using React Router Typed Object, you can leverage the power of TypeScript to catch errors at compile time, assist in refactoring, and provide better autocompletion and documentation within your code editor. Check more details and examples in the [Typesafe references and refactorings](#typesafe-references-and-refactorings) docs section.

## Features

- **Seamless Integration**: Works with exact `react-router`'s `RouteObject` type and `react-router-dom`'s "createRouter\*" functions.
- **Typesafe Route Definitions**: Automatically infer types from your route configurations.
- **Path Parameter Handling**: Define routes with dynamic parameters and get type-checked path generation.
- **Search Parameter Validation**: Use any validation library you like to define and validate search parameters.

## Installation

To install React Router Typed Object, use npm or yarn:

```bash
npm install react-router-typed-object
```

## Usage

Here's how you can use React Router Typed Object in your project.

### Defining Routes with `inferRouteObject`

The `inferRouteObject` function allows you to define your routes and automatically infer their types.

```tsx
import { inferRouteObject } from "react-router-typed-object";

export const ROUTES = inferRouteObject({
  path: "a",
  children: [
    { path: "b" },
    {
      path: "c",
      children: [{ children: [{ children: [{ path: "d" }] }] }],
    },
  ],
});
```

This will create a `ROUTES` object that contains typed paths for all nested routes.

### Generating Paths with Parameters

You can define routes with path parameters, and `inferRouteObject` will ensure that you provide the correct parameters when generating paths.

```tsx
export const ROUTES = inferRouteObject({
  path: "a/:b",
  children: [{ path: "c/:d" }],
});

const path = ROUTES["/a/:b/c/:d"].path({ b: "B", d: "D" });
// path is "/a/B/c/D"
```

If you try to omit required parameters or provide incorrect ones, TypeScript will show an error.

### Handling Search Parameters with Validation

You can define search parameters using any type predicate, which give you both typesafety and runtime validation.

```tsx
import { z } from "zod";

export const ROUTES = inferRouteObject({
  path: "a/:b",
  children: [
    {
      path: "c/:d",
      searchParams: z.object({
        z: z.string(),
        q: z.string().optional(),
      }).parse, // NOTE the `.parse`, we need only a validation function
    },
  ],
});

const path = ROUTES["/a/:b/c/:d"].path({ b: "B", d: "D", z: "Z" });
// path is "/a/B/c/D?z=Z"
```

If you provide invalid search parameters, the validation function will throw an error at runtime, ensuring your app only navigates to valid URLs.

### Using typesafe paths with a router

"ROUTES" is your source of truth. You can use it to get a typesafe access to your routes in all other related APIs.

```tsx
<Route path={ROUTES["/a/:b/c/:d"].path.pattern} />
```

OR, of course:

```tsx
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([ROUTES]);
```

```tsx
const navigate = useNavigate();
const toD = (b: string, d: string) => {
  navigate(ROUTES["/a/:b/c/:d"].path({ b, d }));
};

<a onClick={() => toD("B", "D")}>Go to D</a>;
```

### Navigating with built in `createRouter`

You can use your "ROUTES" object to get a typesafe access to your routes

The `createRouter` function creates a router instance with typesafe `navigate` method which added to every "path".

```tsx
import { createRouter } from "react-router-typed-object";
import { z } from "zod";

const ROUTER = createRouter([
  {
    path: "a",
    children: [
      {
        path: ":b/c/:d",
        searchParams: z.object({ z: z.string() }).parse,
      },
    ],
  },
]);

ROUTER["/a/:b/c/:d"].path.navigate({ b: "B", d: "D", z: "Z" });
// `location.href` is "/a/B/c/D?z=Z"
```

The `.navigate()` method of a router path is just a tiny bind function from the path to router `navigate` method.

## Typesafe references and refactorings

The motivation behind creating this library stemmed from working on a large legacy project with a massive route configuration exceeding 1,000 lines of code. Managing and maintaining such a large configuration was challenging. It was easy to make mistakes like creating duplicate paths or unintentionally removing or modifying routes that were used elsewhere in the application.

React Router Typed Object addresses these issues by allowing developers to define a strict list of all routes with full typesafety. The "path" property becomes a crucial element to synchronize type references between route usages and route definitions. With this library, you can use TypeScript's powerful tooling to find all route usages from the configuration or locate the relevant configuration part from a usage point. This ensures consistency and reduces the likelihood of errors in your routing logic.

## API Reference

### `inferRouteObject(routeConfig, basename = '')`

Generates a typesafe routes object from the given route configuration. The configuration is exactly `import { type RouteObject } from "react-router"`, but with additional `searchParams` property with a validation function.

- **Parameters**:
  - `routeConfig`: An object representing the route configuration. It is same object from original React Router (`import { type RouteObject } from "react-router"`). Each route can include `path`, `children`, and additional `searchParams` validation function.
  - `basename`: optional starting path.
- **Returns**: The same route object with additional "`\${string}`" properties which includes full routes paths in any depth of the config.

### `createRouter(routeConfig, options)`

Creates a router instance with typesafe navigation methods.

- **Parameters**:
  - `routeConfig`: The same route configuration used in `inferRouteObject`.
  - `options`:
    - all original options from `createBrowserRouter`.
    - `basename`: optional starting path.
    - `createRouter`: optional router creation function, defaults to `createBrowserRouter`.
- **Returns**: A router instance with navigation methods and all "`\${string}`" routes from `inferRouteObject`
