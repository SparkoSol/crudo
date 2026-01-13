import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { Suspense } from "react";
import { routes } from "./routes";
import { Loading } from "../components/Loading";

const wrapWithSuspense = (routes: RouteObject[]): RouteObject[] => {
  return routes.map((route) => {
    const wrapped: RouteObject = {
      ...route,
      element: route.element ? (
        <Suspense fallback={<Loading fullScreen />}>{route.element}</Suspense>
      ) : (
        route.element
      ),
    };

    if (route.children) {
      (wrapped as RouteObject & { children: RouteObject[] }).children =
        wrapWithSuspense(route.children);
    }

    return wrapped;
  });
};

export const router = createBrowserRouter(wrapWithSuspense(routes));
