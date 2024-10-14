import { type Router } from '@remix-run/router';
import { type RouteObject } from 'react-router';
import { createBrowserRouter } from 'react-router-dom';

import { InferRoute, PathRoute, Pattern, inferRouteObject, isRoutePattern } from './inferRouteObject.js';

export type NavigationOptions = Parameters<Router['navigate']>[1];

export interface Go<Params = Record<string, unknown>> {
  /** Make SPA transition to the route with relative parameters */
  navigate(params: Params, opts?: NavigationOptions): void;
}

type BindRoutes<T extends Record<string, { path: PathRoute }>> = {
  [K in keyof T]: T[K] & {
    path: T[K]['path'] & Go<Parameters<T[K]['path']>[0]>;
  };
};

export const bindRouter = <
  Router extends { navigate: (url: string, opts?: NavigationOptions) => void },
  T extends Record<string, { path: PathRoute }>,
>(
  router: Router,
  routes: T,
): BindRoutes<T> => {
  for (const pattern in routes) {
    if (isRoutePattern(pattern)) {
      const path = routes[pattern]?.path as PathRoute & Go;
      path.navigate = (params, opts) => router.navigate(path(params as unknown as Parameters<typeof path>[0]), opts);
    }
  }

  return routes as BindRoutes<T>;
};

export type DOMRouterOpts<Basename extends Pattern> = Parameters<typeof createBrowserRouter>[1] & {
  basename?: Basename;
};

export const createRouter = <const T extends RouteObject, Basename extends Pattern = '/'>(
  routeObject: Array<T>,
  options: DOMRouterOpts<Basename> & { createRouter?: typeof createBrowserRouter } = {},
): Router & BindRoutes<InferRoute<{ children: [T] }, Basename>> => {
  const { createRouter = createBrowserRouter, ...opts } = options;
  const router = createRouter(routeObject, opts);
  const routes = inferRouteObject({ children: routeObject }, opts?.basename) as unknown as InferRoute<{ children: [T] }, Basename>;
  return Object.assign(router, bindRouter(router, routes));
};
