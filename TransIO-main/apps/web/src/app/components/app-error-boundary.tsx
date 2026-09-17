import React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

function formatErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while rendering TransIO.";
}

function ProductionErrorFallback({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-xl shadow-black/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          TransIO
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          We could not load this view
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The app recovered from a rendering issue. Try refreshing the page or
          return to a safe route.
        </p>
        <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {message}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Refresh
          </button>
          <a
            href="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </section>
    </main>
  );
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ProductionErrorFallback
          message={formatErrorMessage(this.state.error)}
        />
      );
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  return <ProductionErrorFallback message={formatErrorMessage(error)} />;
}
