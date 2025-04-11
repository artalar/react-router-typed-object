// `{}` is not equal to `Record<string, never>` in some cases
// `void` need to describe an optional argument
/* eslint-disable @typescript-eslint/ban-types */

import { type RouteObject } from "react-router";
import { useLocation } from "react-router-dom";

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

// Type for useParams hook
export type UseParamsHook<
  Path extends string = string,
  SearchParams extends SearchParamsType = undefined
> = (
  fallback?: Partial<PathRouteParams<Path, SearchParams>>
) => PathRouteParams<Path, SearchParams>;

export interface PathRoute<
  Path extends string = string,
  SearchParams extends SearchParamsType = undefined
> {
  /** Get the real path for this route based on the needed parameters */
  (params: PathRouteParams<Path, SearchParams>): string;

  pattern: Path;
  
  /**
   * Hook to get the current route parameters with type safety
   * @param fallback Optional fallback values for missing parameters
   * @returns The current route parameters
   */
  useParams: UseParamsHook<Path, SearchParams>;
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

// Helper functions for parameter handling
const extractParamNames = (pattern: string): string[] => {
  const paths = pattern.split("/");
  return paths
    .filter((part) => part.startsWith(":"))
    .map((name) => name.slice(1));
};

const validateParams = (
  params: Record<string, string> | undefined,
  paramsNames: string[],
  pattern: string
): void => {
  if (!params) {
    if (paramsNames.length > 0 && paramsNames[0] && !paramsNames[0].endsWith("?")) {
      throw new Error(`Missing parameters for route "${pattern}"`);
    }
    return;
  }
  
  const missedParam = paramsNames.find(
    (name) => !name.endsWith("?") && !(name in params)
  );
  
  if (missedParam) {
    throw new Error(
      `Missing parameter "${missedParam}" for route "${pattern}"`
    );
  }
};

const buildPath = (
  pattern: string,
  paramsNames: string[],
  params: Record<string, string> | undefined
): string => {
  let path = pattern;
  
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
  
  return path;
};

// Extract path parameters from URL by matching against pattern
const extractPathParams = (
  pattern: string,
  pathname: string
): Record<string, string> => {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]!;
    const pathPart = pathParts[i] || '';
    
    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      const isOptional = paramName.endsWith('?');
      const cleanParamName = isOptional ? paramName.slice(0, -1) : paramName;
      
      // For non-optional parameters, empty values are considered missing
      if (pathPart) {
        // Decode URL-encoded characters
        params[cleanParamName] = decodeURIComponent(pathPart);
      } else if (!isOptional) {
        // Mark as undefined to trigger validation error later
        params[cleanParamName] = '';
      }
    }
  }
  
  return params;
};


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
        const paramsNames = extractParamNames(pattern);

        const get = (params: void | Record<string, string>) => {
          validateParams(params as Record<string, string> | undefined, paramsNames, pattern);
          
          let path = buildPath(pattern, paramsNames, params as Record<string, string> | undefined);

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

        // Create the useParams hook
        const useParamsHook: UseParamsHook<string, typeof searchParamsContract extends {
          (value: unknown): infer T;
        } ? T : undefined> = (fallback) => {
          const location = useLocation();
          
          // Extract path parameters from the URL
          const pathParams = extractPathParams(pattern, location.pathname);
          
          // Check for missing required parameters
          const missingParams: string[] = [];
          paramsNames.forEach(name => {
            if (!name.endsWith("?") && (!pathParams[name] || pathParams[name] === '')) {
              missingParams.push(name);
            }
          });
          
          // If there are missing parameters, check if fallback provides them
          if (missingParams.length > 0) {
            if (fallback) {
              const stillMissing = missingParams.filter(name => !fallback[name]);
              if (stillMissing.length > 0) {
                throw new Error(`Missing parameter "${stillMissing[0]}" for route "${pattern}"`);
              }
            } else {
              throw new Error(`Missing parameter "${missingParams[0]}" for route "${pattern}"`);
            }
          }
          
          // Create a new object with fallback values first, then override with valid path params
          const mergedParams: Record<string, string> = { ...(fallback || {}) };
          
          // Only add non-empty path params
          Object.entries(pathParams).forEach(([key, value]) => {
            if (value !== '') {
              mergedParams[key] = value;
            }
          });
          
          // Parse search params if needed
          if (searchParamsContract && location.search) {
            const searchParams = new URLSearchParams(location.search);
            const searchParamsObject: Record<string, string> = {};
            
            for (const [key, value] of searchParams.entries()) {
              searchParamsObject[key] = value;
            }
            
            // Validate search params
            try {
              const validatedSearchParams = searchParamsContract(searchParamsObject);
              return { ...mergedParams, ...validatedSearchParams } as any;
            } catch (error) {
              // If validation fails and we have fallback search params, use those
              if (fallback) {
                try {
                  const validatedFallbackParams = searchParamsContract(fallback);
                  return { ...mergedParams, ...validatedFallbackParams } as any;
                } catch (fallbackError) {
                  throw new Error(`Invalid search parameters and fallback: ${error}`);
                }
              }
              throw error;
            }
          }
          
          return mergedParams as any;
        };

        // eslint-disable-next-line no-param-reassign
        routes[pattern] = {
          path: Object.assign(get, {
            pattern,
            useParams: useParamsHook
          })
        };
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
