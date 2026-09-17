import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout";
import React, { lazy, Suspense } from "react";
import { CardSkeleton } from "../components/ui/CardSkeleton";
import { RouteErrorBoundary } from "./components/app-error-boundary";

const Landing = lazy(() =>
  import("./components/landing").then((module) => ({ default: module.Landing }))
);
const Dashboard = lazy(() =>
  import("./components/dashboard").then((module) => ({
    default: module.Dashboard,
  }))
);
const MyLoads = lazy(() =>
  import("./components/my-loads").then((module) => ({ default: module.MyLoads }))
);
const SavedLoads = lazy(() =>
  import("./components/saved-loads").then((module) => ({
    default: module.SavedLoads,
  }))
);
const Settings = lazy(() =>
  import("./components/settings").then((module) => ({
    default: module.Settings,
  }))
);
const Support = lazy(() =>
  import("./components/support").then((module) => ({
    default: module.Support,
  }))
);
const Login = lazy(() =>
  import("./components/login").then((module) => ({ default: module.Login }))
);
const ForgotPassword = lazy(() =>
  import("./components/forgot-password").then((module) => ({
    default: module.ForgotPassword,
  }))
);
const ResetPassword = lazy(() =>
  import("./components/reset-password").then((module) => ({
    default: module.ResetPassword,
  }))
);
const Admin = lazy(() =>
  import("./components/admin").then((module) => ({ default: module.Admin }))
);
const Loads = lazy(() => import("../pages/Loads"));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

function withSuspense(component: React.ReactNode) {
  return function SuspendedRoute() {
    return <Suspense fallback={<RouteFallback />}>{component}</Suspense>;
  };
}

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, Component: withSuspense(<Landing />) },
      { path: "login", Component: withSuspense(<Login />) },
      { path: "register", Component: withSuspense(<Login initialMode="register" />) },
      {
        path: "forgot-password",
        Component: withSuspense(<ForgotPassword />),
      },
      { path: "reset-password", Component: withSuspense(<ResetPassword />) },
      {
        Component: Layout,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: "dashboard", Component: withSuspense(<Dashboard />) },
          { path: "loads", Component: withSuspense(<Loads />) },
          {
            path: "load-board",
            Component: () => <Navigate to="/loads" replace />,
          },
          { path: "my-loads", Component: withSuspense(<MyLoads />) },
          { path: "saved-loads", Component: withSuspense(<SavedLoads />) },
          { path: "support", Component: withSuspense(<Support />) },
          { path: "admin", Component: withSuspense(<Admin />) },
          {
            path: "admin/users",
            Component: withSuspense(<Admin view="users" />),
          },
          {
            path: "admin/stats",
            Component: withSuspense(<Admin view="stats" />),
          },
          { path: "settings", Component: withSuspense(<Settings />) },
        ],
      },
      { path: "*", Component: () => <Navigate to="/" replace /> },
    ],
  },
]);
