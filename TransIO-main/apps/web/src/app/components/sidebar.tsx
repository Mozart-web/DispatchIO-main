import { NavLink } from "react-router";
import {
  LayoutDashboard,
  PackageSearch,
  Package,
  Bookmark,
  Settings,
  X,
  Shield,
  ChevronRight,
  BellRing,
  Radio,
  LifeBuoy,
} from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatRoleLabel, useAppState } from "../context/app-state";
import logo from "/logo.png";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const baseMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: PackageSearch, label: "Load Board", path: "/loads" },
  { icon: Package, label: "My Loads", path: "/my-loads" },
  { icon: Bookmark, label: "Saved Loads", path: "/saved-loads" },
  { icon: LifeBuoy, label: "Support", path: "/support" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAdmin, profile, unreadNotifications, allLoads } = useAppState();
  const menuItems = isAdmin
    ? [
        ...baseMenuItems.slice(0, 5),
        { icon: Shield, label: "Admin", path: "/admin" },
        baseMenuItems[5],
      ]
    : baseMenuItems;

  const initials = (profile?.name || "TR")
    .split(" ")
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm xl:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 border-r border-sidebar-border/80",
          "bg-sidebar text-sidebar-foreground shadow-2xl shadow-black/10 dark:shadow-black/30",
          "transition-transform duration-300 ease-in-out xl:static xl:translate-x-0 xl:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-sidebar-border/80 px-4 py-4">
            <div className="mb-4 flex items-center justify-between xl:hidden">
              <h2 className="text-base font-semibold text-sidebar-foreground">
                Navigation
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-3 px-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/40">
                Workspace
              </p>
            </div>

            <nav className="space-y-1.5">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-all duration-200",
                      isActive
                        ? "border-sidebar-primary/25 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "border-transparent text-sidebar-foreground/78 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-md border transition-all duration-200",
                          isActive
                            ? "border-sidebar-primary/20 bg-sidebar-primary-foreground/10 text-sidebar-primary-foreground"
                            : "border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.label}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isActive
                            ? "text-sidebar-primary-foreground/80"
                            : "text-sidebar-foreground/35 group-hover:translate-x-0.5 group-hover:text-sidebar-foreground/65"
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-sidebar-border/80 px-4 py-4">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/55 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sm font-semibold text-sidebar-foreground">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {profile?.name || "TransIO User"}
                  </p>
                  <p className="truncate text-xs text-sidebar-foreground/60">
                    {formatRoleLabel(profile?.role)} account
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-md border border-sidebar-border bg-sidebar px-3 py-2">
                <span className="text-xs text-sidebar-foreground/60">
                  TransIO
                </span>
                <span className="text-[11px] font-semibold tracking-[0.14em] text-sidebar-foreground/70">
                  v1.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
