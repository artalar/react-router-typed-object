// `{}` is not equal to `Record<string, never>` in some cases
// `void` need to describe an optional argument
/* eslint-disable @typescript-eslint/ban-types */

import { type RouteObject } from "react-router";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SearchParamsContract<
  T extends Record<string, any> = Record<string, any>
> {
  (value: unknown): T;
}

export type SearchParamsType = Record<string, unknown> | undefined;

declare module "react-router" {
  export interface IndexRouteObject {
    searchParams?: SearchParamsContract;
  }
  export interface NonIndexRouteObject {
    searchParams?: SearchParamsContract;
  }
}

/** This generic helps format an intersection type for a more readable view */
export type Shallow<T> = T extends object
  ? {
      [Key in keyof T]: T[Key];
    }
  : T;

export type Pattern = `/${string}`;

export type Routes = {
  [key in Pattern]?: { path: PathRoute };
};

export interface PathRoute<
  Path extends string = string,
  SearchParams extends SearchParamsType = undefined
> {
  /** Get the real path for this route based on the needed parameters */
  (params: PathRouteParams<Path, SearchParams>): string;

  pattern: Path;
}

export type PathRouteParams<
  Path extends string = string,
  SearchParams extends SearchParamsType = undefined
> = Path extends `${string}:${string}`
  ? PathRoutePathParams<Path> &
      (SearchParams extends Record<string, unknown> ? SearchParams : {})
  : SearchParams extends Record<string, unknown>
  ? SearchParams
  : void;

export type PathRoutePathParams<Path extends string = string> =
  Path extends `:${infer Param}/${infer Rest}`
    ? { [key in Param]: string } & PathRoutePathParams<Rest>
    : Path extends `:${infer MaybeOptionalParam}`
    ? MaybeOptionalParam extends `${infer OptionalParam}?`
      ? { [key in OptionalParam]?: string }
      : { [key in MaybeOptionalParam]: string }
    : Path extends `${string}/${infer Rest}`
    ? PathRoutePathParams<Rest>
    : {};

export type InferRoute<
  T extends RouteObject,
  Parent extends string
> = T extends {
  children: [
    infer Child extends RouteObject,
    ...infer Children extends Array<RouteObject>
  ];
}
  ? (Child extends { path: infer Path extends string }
      ? InferRoutePath<Child, FixRoot<`${Parent}/${Path}`>>
      : InferRoute<Child, Parent>) &
      InferRoute<{ children: Children }, Parent>
  : {};

export type FixRoot<T extends string> = T extends `///${infer Path}`
  ? `/${Path}`
  : T extends `//${infer Path}`
  ? `/${Path}`
  : T;

export type InferRoutePath<T extends RouteObject, Path extends string> = Record<
  Path,
  Shallow<
    Pick<T, "path"> & {
      path: PathRoute<
        Path,
        T extends {
          searchParams: SearchParamsContract<infer SearchParams>;
        }
          ? {} extends SearchParams
            ? SearchParams | undefined
            : SearchParams
          : undefined
      >;
    }
  >
> &
  InferRoute<T, Path>;

export const isRoutePattern = (pattern: string): pattern is Pattern =>
  pattern.startsWith("/");

const _inferRouteObject = <
  const T extends RouteObject,
  Parent extends string = ""
>(
  routeObject: T,
  parent: Parent = "" as Parent,
  routes: Routes = {}
) => {
  for (const child of routeObject.children ?? []) {
    let path = parent as `/${string}`;
    if ("path" in child) {
      path = `${parent}/${child.path}` as `/${string}`;
      if (path.startsWith("//")) path = path.slice(1) as `/${string}`;

      const pattern = path;

      if (isRoutePattern(pattern)) {
        const searchParamsContract = child.searchParams;
        const paths = pattern.split("/");
        const paramsNames = paths
          .filter((part) => part.startsWith(":"))
          .map((name) => name.slice(1));

        const get = (params: void | Record<string, string>) => {
          const missedParam = params
            ? paramsNames.find((name) => !(name in params))
            : paramsNames[0];

          if (missedParam && !missedParam.endsWith("?")) {
            throw new Error(
              `Missing parameter "${missedParam}" for route "${pattern}"`
            );
          }

          let path: string = pattern;

          for (const name of paramsNames) {
            if (name.endsWith("?")) {
              path = path.replace(
                `:${name}`,
                params?.[name.slice(0, -1)] ?? ""
              );
            } else {
              path = path.replace(`:${name}`, params?.[name] ?? "");
            }
          }

          if (!searchParamsContract) {
            return path;
          }

          const searchParamsData = searchParamsContract(params ?? {});
          const searchParams = new URLSearchParams();

          for (const [k, v] of Object.entries(searchParamsData)) {
            if (v !== undefined) {
              searchParams.append(k, v);
            }
          }

          const searchParamsString = searchParams.toString();
          return `${path}${searchParamsString && `?${searchParamsString}`}`;
        };

        // eslint-disable-next-line no-param-reassign
        routes[pattern] = { path: Object.assign(get, { pattern }) };
      }
    }
    if ("children" in child) {
      _inferRouteObject(child, path, routes);
    }
  }
};

export const inferRouteObject = <
  const T extends RouteObject,
  Basename extends string = ""
>(
  routeObject: T,
  basename: Basename = "" as Basename
): T & InferRoute<{ children: [T] }, Basename> => {
  const routes: Routes = {};
  _inferRouteObject({ children: [routeObject] }, basename, routes);

  return { ...routeObject, ...routes } as T &
    InferRoute<{ children: [T] }, Basename>;
};

/* eslint-enable @typescript-eslint/ban-types */
