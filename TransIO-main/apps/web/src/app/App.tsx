import { RouterProvider } from "react-router";
import { router } from "./routes";
import React from "react";
import { AppStateProvider } from "./context/app-state";
import { Toaster } from "./components/ui/sonner";
import { AppErrorBoundary } from "./components/app-error-boundary";

export default function App() {
  return (
    <AppErrorBoundary>
      <AppStateProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </AppStateProvider>
    </AppErrorBoundary>
  );
}
