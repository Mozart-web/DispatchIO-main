import {
  Search,
  Bell,
  Menu,
  User,
  Moon,
  Sun,
  X,
  LogOut,
  LogIn,
  CheckCheck,
  Settings,
  Sparkles,
  ShieldCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "/logo.png";
import React from "react";
import { formatRoleLabel, useAppState } from "../context/app-state";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { toast } from "sonner";

interface TopNavProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export function TopNav({ onMenuClick, sidebarOpen }: TopNavProps) {
  const navigate = useNavigate();
  const notificationsRef = React.useRef<HTMLDivElement | null>(null);
  const profileRef = React.useRef<HTMLDivElement | null>(null);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const {
    darkMode,
    toggleDarkMode,
    notifications,
    unreadNotifications,
    profile,
    currentProfile,
    isAdmin,
    isAuthenticated,
    logout,
    searchQuery,
    setSearchQuery,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useAppState();
  const hasUnreadNotifications = unreadNotifications > 0;
  const hasNotifications = notifications.length > 0;

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      setProfileOpen(false);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setIsLoggingOut(false);
      toast.error(error instanceof Error ? error.message : "Logout failed");
    }
  };

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="z-50 flex h-14 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 shadow-sm backdrop-blur-2xl sm:h-16 sm:gap-4 sm:px-4 lg:px-6"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="relative h-9 w-9 rounded-md hover:bg-accent hover:text-foreground xl:hidden sm:h-10 sm:w-10"
      >
        {sidebarOpen ? (
          <X className="h-4 w-4 text-foreground sm:h-5 sm:w-5" />
        ) : (
          <Menu className="h-4 w-4 text-foreground sm:h-5 sm:w-5" />
        )}
      </Button>

      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-background shadow-sm sm:h-11 sm:w-11">
          <ImageWithFallback
            src={logo}
            alt="TransIO Logo"
            className="h-full w-full object-contain opacity-100"
          />
        </div>
        <div className="hidden min-w-0 sm:block">
          <span className="block font-semibold tracking-tight text-foreground">
            Trans<span className="text-primary">IO</span>
          </span>
          <span className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Dispatch platform
          </span>
        </div>
      </div>

      <div className="hidden max-w-2xl flex-1 items-center gap-2 md:flex">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="load-search-input"
            placeholder="Search loads, broker, lane, tags..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 rounded-md border-border bg-input-background pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
          />
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1 lg:flex">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="leading-tight">
            <p className="text-xs font-medium text-foreground">
              {profile?.name || "Dispatcher"}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                {unreadNotifications} unread
              </span>
              <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
                {isAdmin ? "Admin" : formatRoleLabel(currentProfile?.role)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="hidden h-9 w-9 rounded-md hover:bg-accent hover:text-foreground sm:flex sm:h-10 sm:w-10"
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-foreground sm:h-5 sm:w-5" />
          ) : (
            <Moon className="h-4 w-4 text-foreground sm:h-5 sm:w-5" />
          )}
        </Button>

        <div ref={notificationsRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setNotificationsOpen((current) => !current);
              setProfileOpen(false);
            }}
            className="relative h-9 w-9 rounded-md hover:bg-accent hover:text-foreground sm:h-10 sm:w-10"
          >
            <Bell className="h-4 w-4 text-foreground sm:h-5 sm:w-5" />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1 flex h-2.5 min-w-2.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground ring-2 ring-card sm:top-1.5 sm:right-1.5">
                {unreadNotifications}
              </span>
            )}
          </Button>
          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[calc(100vw-1rem)] max-w-[24rem] overflow-hidden rounded-lg border border-border bg-popover/96 shadow-xl backdrop-blur-2xl sm:w-[24rem]">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Notifications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Platform updates and activity
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllNotificationsRead}
                    disabled={!hasUnreadNotifications}
                    title="Mark all notifications as read"
                    className="h-8 rounded-md px-2 text-xs hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCheck className="mr-1 h-3.5 w-3.5" />
                    Mark
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearNotifications}
                    disabled={!hasNotifications}
                    title="Clear all notifications"
                    className="h-8 w-8 rounded-md hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="max-h-96 overflow-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markNotificationRead(notification.id)}
                      className={`w-full border-b border-border px-4 py-3 text-left hover:bg-accent/55 last:border-b-0 ${
                        notification.read ? "" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-popover ${
                            notification.read
                              ? "border border-border bg-background"
                              : "bg-primary"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {notification.description}
                          </p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {notification.createdAt}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setProfileOpen((current) => !current);
              setNotificationsOpen(false);
            }}
            className="h-9 w-9 rounded-md hover:bg-accent sm:h-10 sm:w-10"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background sm:h-8 sm:w-8">
              <User className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
            </div>
          </Button>
          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 min-w-56 rounded-lg border border-border bg-popover/96 p-2 shadow-xl backdrop-blur-2xl">
              {isAuthenticated ? (
                <>
                  <div className="rounded-md bg-background px-3 py-3">
                    <p className="text-sm font-semibold capitalize text-foreground">
                      {profile?.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {profile?.email}
                    </p>
                    <p
                      className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                        isAdmin
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-foreground"
                      }`}
                    >
                      {isAdmin && <ShieldCheck className="h-3 w-3" />}
                      {isAdmin
                        ? "Admin"
                        : formatRoleLabel(currentProfile?.role)}
                    </p>
                  </div>
                  <div className="my-2 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                  >
                    <Settings className="h-4 w-4" />
                    Account settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isLoggingOut ? "Signing out..." : "Log out"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
