import {
  createRootRouteWithContext,
  createRoute,
  Outlet,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { AppShell } from "../components/AppShell";
import { EmptyPane } from "../components/EmptyPane";
import { SessionView } from "../components/SessionView";
import { ProjectSessionsPane } from "../components/ProjectSessionsPane";

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <EmptyPane />,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "p/$projectDir",
  component: () => <ProjectSessionsPane />,
});

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "p/$projectDir/s/$sessionId",
  component: () => <SessionView />,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute,
  sessionRoute,
]);
