# React Router Typed Object

Bringing full typesafety to your React Router configurations

## Introduction

**React Router Typed Object** is a helper library for [React Router](https://reactrouter.com) that brings complete typesafety to your route configurations. It enables you to define your routes in a way that TypeScript can infer all the necessary types, ensuring that all router references are consistent and safe across your codebase. This is especially beneficial in large applications with complex routing structures, where maintaining typesafety can greatly reduce errors and improve developer productivity.

By using React Router Typed Object, you can leverage the power of TypeScript to catch errors at compile time, assist in refactoring, and provide better autocompletion and documentation within your code editor. Check more details and examples in the [Typesafe references and refactorings](#typesafe-references-and-refactorings) docs section.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/edit/react-router-typed-object?file=src%2Frouter.tsx,src%2Fcomponents.tsx)

## Features

- **Seamless Integration**: Works with exact `react-router`'s `RouteObject` type and `react-router-dom`'s "createRouter\*" functions.
- **Typesafe Route Definitions**: Automatically infer types from your route configurations.
- **Path Parameter Handling**: Define routes with dynamic parameters and get type-checked path generation.
- **Search Parameter Validation**: Use any validation library you like to define and validate search parameters.
- **Type-Safe useParams Hook**: Access route parameters with full type safety using the built-in `useParams` hook.

## Installation

To install React Router Typed Object, use npm or yarn:

```bash
npm install react-router-typed-object @remix-run/router
```

> `@remix-run/router` explicit installation is needed to allow correct type inference.

## Usage

Here's how you can use React Router Typed Object in your project.

### Defining Routes with `inferRouteObject`

The `inferRouteObject` function allows you to define your routes and automatically infer their types.

```tsx
import { inferRouteObject } from "react-router-typed-object";

export const ROUTES = inferRouteObject({
  path: "home",
  children: [
    { path: "products" },
    {
      path: "categories",
      children: [{ children: [{ children: [{ path: "electronics" }] }] }],
    },
  ],
});
```

This will create a `ROUTES` object that contains typed paths for all nested routes.

### Generating Paths with Parameters

You can define routes with path parameters, and `inferRouteObject` will ensure that you provide the correct parameters when generating paths.

```tsx
export const ROUTES = inferRouteObject({
  path: "products/:productId",
  children: [{ path: "reviews/:reviewId" }],
});

const productReviewPath = ROUTES["/products/:productId/reviews/:reviewId"].path(
  { productId: "123", reviewId: "456" }
);
// productReviewPath is "/products/123/reviews/456"
```

If you try to omit required parameters or provide incorrect ones, TypeScript will show an error.

### Handling Search Parameters with Validation

You can define search parameters using any type predicate, which give you both typesafety and runtime validation.

```tsx
import { z } from "zod";

export const ROUTES = inferRouteObject({
  path: "products/:productId",
  children: [
    {
      path: "reviews/:reviewId",
      searchParams: z.object({
        sortBy: z.enum(["date", "rating"]).default("date"),
        search: z.string().optional(),
      }).parse, // NOTE the `.parse`, we need only a validation function
    },
  ],
});

const productReviewPath = ROUTES["/products/:productId/reviews/:reviewId"].path(
  { productId: "123", reviewId: "456", sortBy: "rating", search: "best" }
);
// productReviewPath is "/products/123/reviews/456?sortBy=rating&search=best"
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
const goToProductReview = (productId: string, reviewId: string) => {
  navigate(
    ROUTES["/products/:productId/reviews/:reviewId"].path({
      productId,
      reviewId,
    })
  );
};

<a onClick={() => goToProductReview("123", "456")}>Go to Review</a>;
```

### Using the useParams hook

The `useParams` hook allows you to access route parameters with full type safety:

```tsx
function MyComponent() {
  // Get parameters with type safety
  const params =
    ROUTES["/products/:productId/reviews/:reviewId"].path.useParams();

  // params.b and params.d are typed as string
  // If the route has search parameters, they are also included in the params object

  return (
    <div>
      <h1>Product ID: {params.productId}</h1>
      <h1>Review ID: {params.reviewId}</h1>
    </div>
  );
}
```

You can also provide fallback values for missing parameters:

```tsx
function MyComponent() {
  // Provide fallback values for missing parameters
  const params = ROUTES[
    "/products/:productId/reviews/:reviewId"
  ].path.useParams({
    productId: "default-product",
    reviewId: "default-review",
  });

  return (
    <div>
      <h1>Product: {params.productId}</h1>
      <h1>Review: {params.reviewId}</h1>
    </div>
  );
}
```

The `useParams` hook will:

1. Return the current route parameters with full type safety
2. Throw a runtime error if required parameters are missing and not provided in the fallback
3. Provide TypeScript compile-time errors if you try to access parameters that don't exist

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
        path: ":productId/reviews/:reviewId",
        searchParams: z.object({
          sortBy: z.enum(["date", "rating"]).default("date"),
        }).parse,
      },
    ],
  },
]);

ROUTER["/products/:productId/reviews/:reviewId"].path.navigate({
  productId: "123",
  reviewId: "456",
  sortBy: "rating",
});
// `location.href` is "/products/123/reviews/456?sortBy=rating"
```

The `.navigate()` method of a router path is just a tiny bind function from the path to router `navigate` method.

## Typesafe references and refactorings

The motivation behind creating this library stemmed from working on a large legacy project with a massive route configuration exceeding 1,000 lines of code. Managing and maintaining such a large configuration was challenging. It was easy to make mistakes like creating duplicate paths or unintentionally removing or modifying routes that were used elsewhere in the application.

React Router Typed Object addresses these issues by allowing developers to define a strict list of all routes with full typesafety. The "**path**" property becomes a crucial element to synchronize type references between route usages and route definitions. With this library, you can use TypeScript's powerful tooling to find all route usages from the configuration or locate the relevant configuration part from a usage point. This ensures consistency and reduces the likelihood of errors in your routing logic.

Open this example on [StackBlitz](https://stackblitz.com):

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/edit/react-router-typed-object?file=src%2Frouter.tsx,src%2Fcomponents.tsx)

![image](https://github.com/user-attachments/assets/071f4a6b-f820-4cb6-8f52-0f0997faffa4)

![image](https://github.com/user-attachments/assets/596a372b-aa88-4be4-bd52-3099ff644622)

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

### `path.useParams(fallback?)`

A hook that returns the current route parameters with full type safety.

- **Parameters**:
  - `fallback`: Optional object containing fallback values for missing parameters.
- **Returns**: An object containing all route parameters (path and search parameters) with proper types.
- **Throws**: Runtime error if required parameters are missing and not provided in the fallback.
- **Type Safety**: Provides TypeScript compile-time errors if you try to access parameters that don't exist.
