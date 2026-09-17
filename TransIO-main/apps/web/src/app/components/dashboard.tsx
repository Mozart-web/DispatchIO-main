import { Package, TrendingUp, Clock, Shield, ArrowUpRight } from "lucide-react";
import { Card } from "./ui/card";
import { Link } from "react-router";
import React from "react";
import { motion } from "motion/react";
import { useAppState } from "../context/app-state";
import { CardSkeleton } from "../../components/ui/CardSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatLoadLocation } from "../data/loads";

export function Dashboard() {
  const {
    savedLoadIds,
    bookedLoadIds,
    allLoads,
    isAdmin,
    lastLoadsSync,
    isLoadingLoads,
  } = useAppState();
  const isInitialLoadsLoading = isLoadingLoads && allLoads.length === 0;

  const stats = [
    {
      label: "Available Loads",
      value: allLoads.length.toLocaleString(),
      change: "Live",
      icon: Package,
      color: "text-primary",
      bgColor: "bg-muted",
    },
    {
      label: "Active Loads",
      value: bookedLoadIds.length.toString(),
      change: "Booked",
      icon: TrendingUp,
      color: "text-foreground",
      bgColor: "bg-muted",
    },
    {
      label: "Saved Loads",
      value: savedLoadIds.length.toString(),
      change: "Tracked",
      icon: Clock,
      color: "text-accent-foreground",
      bgColor: "bg-accent/30",
    },
    {
      label: "Admin Access",
      value: isAdmin ? "Enabled" : "Off",
      change: isAdmin ? "Allowed" : "User mode",
      icon: Shield,
      color: "text-primary",
      bgColor: "bg-muted",
    },
  ];

  const recentActivity = allLoads.slice(0, 3).map((load) => ({
    id: load.id,
    action: `${load.trailerType} load collected`,
    location: `${formatLoadLocation(load.origin)} to ${formatLoadLocation(
      load.destination
    )}`,
    time: new Date(load.receivedAt).toLocaleString("en-US"),
  }));

  return (
    <div className="min-h-full space-y-6 bg-background p-4 sm:p-6 lg:p-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Operations overview
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Live freight activity, saved loads, booked loads, and admin access
              in one dispatch view.
            </p>
          </div>
          <div className="rounded-md border border-border bg-background px-4 py-3 text-xs text-muted-foreground sm:text-sm">
            Last updated:{" "}
            <span className="font-medium text-foreground">
              {lastLoadsSync
                ? new Date(lastLoadsSync).toLocaleTimeString("en-US")
                : "Waiting for backend"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-6">
        {isInitialLoadsLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} rows={2} />
            ))
          : stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.06 }}
          >
            <Card className="rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/35 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="mb-2 text-xs text-muted-foreground sm:text-sm">
                    {stat.label}
                  </p>
                  <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                    {stat.value}
                  </h2>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground sm:text-sm">
                      {stat.change}
                    </p>
                    <span className="ml-1 text-xs text-muted-foreground">
                      current state
                    </span>
                  </div>
                </div>
                <div
                  className={`rounded-md p-3 ring-1 ring-inset ring-border ${stat.bgColor}`}
                >
                  <stat.icon
                    className={`h-6 w-6 sm:h-7 sm:w-7 ${stat.color}`}
                  />
                </div>
              </div>
            </Card>
          </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="rounded-lg border border-border bg-card p-5 sm:p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            <Link
              to="/loads"
              className="group rounded-lg border border-border bg-background p-4 text-left transition-all duration-200 hover:border-foreground/25 hover:bg-accent/45"
            >
              <div className="mb-3">
                <div className="w-fit rounded-md bg-muted p-2.5">
                  <Package className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h4 className="mb-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                Browse Load Board
              </h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                See live loads
              </p>
            </Link>
            <Link
              to="/my-loads"
              className="group rounded-lg border border-border bg-background p-4 text-left transition-all duration-200 hover:border-foreground/25 hover:bg-accent/45"
            >
              <div className="mb-3">
                <div className="w-fit rounded-md bg-muted p-2.5">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h4 className="mb-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                View Active Loads
              </h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage current shipments
              </p>
            </Link>
            <Link
              to={isAdmin ? "/admin" : "/settings"}
              className="group rounded-lg border border-border bg-background p-4 text-left transition-all duration-200 hover:border-foreground/25 hover:bg-accent/45"
            >
              <div className="mb-3">
                <div className="w-fit rounded-md bg-muted p-2.5">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h4 className="mb-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                {isAdmin ? "Open Admin Panel" : "View Settings"}
              </h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {isAdmin
                  ? "Review stats, users, and load activity"
                  : "Manage your account preferences"}
              </p>
            </Link>
          </div>
        </Card>

        <Card className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">
              Recent Activity
            </h3>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <EmptyState
                title="No recent load activity"
                description="Collector loads will appear here after the backend starts receiving freight data."
                icon={Package}
              />
            ) : (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 border-b border-border/70 pb-4 last:border-0 last:pb-0"
                >
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.action}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {activity.location}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
