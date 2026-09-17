import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { User, Bell, Moon, KeyRound, Database, Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppState } from "../context/app-state";
import { toast } from "sonner";
import React from "react";

export function Settings() {
  const {
    darkMode,
    setDarkMode,
    profile,
    isAdmin,
    currentUserId,
    authError,
    lastLoadsSync,
    updateProfile,
    notifications,
    markAllNotificationsRead,
  } = useAppState();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loadAlerts, setLoadAlerts] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        company: profile.company,
      });
    }
  }, [profile]);

  useEffect(() => {
    const savedPreferences = window.localStorage.getItem("transio-preferences");

    if (!savedPreferences) {
      return;
    }

    try {
      const preferences = JSON.parse(savedPreferences) as {
        emailNotifications?: boolean;
        loadAlerts?: boolean;
      };

      setEmailNotifications(preferences.emailNotifications ?? true);
      setLoadAlerts(preferences.loadAlerts ?? true);
    } catch {
      // Keep defaults when local preferences are malformed.
    }
  }, []);

  const savePreferences = (nextPreferences: {
    emailNotifications: boolean;
    loadAlerts: boolean;
  }) => {
    window.localStorage.setItem(
      "transio-preferences",
      JSON.stringify(nextPreferences)
    );
  };

  const handleEmailNotificationsChange = (value: boolean) => {
    setEmailNotifications(value);
    savePreferences({ emailNotifications: value, loadAlerts });
  };

  const handleLoadAlertsChange = (value: boolean) => {
    setLoadAlerts(value);
    savePreferences({ emailNotifications, loadAlerts: value });
  };

  return (
    <div className="min-h-full space-y-6 bg-background p-4 sm:p-6 lg:p-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Account workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Manage profile, access, preferences, and production readiness.
        </p>
        <div className="mt-4 inline-flex rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
          {profile?.name || "TransIO User"} | {profile?.company || "Dispatch"}
        </div>
      </div>

      <div className="grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-md bg-muted p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg text-foreground sm:text-xl">
                Profile Settings
              </h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm text-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border-border bg-input-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm text-foreground">
                  Company
                </Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      company: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border-border bg-input-background text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-foreground">
                    Login Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    readOnly
                    className="h-10 rounded-md border-border bg-muted text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm text-foreground">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className="h-10 rounded-md border-border bg-input-background text-foreground"
                  />
                </div>
              </div>
              <Button
                className="h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (!profile) {
                    return;
                  }

                  updateProfile({
                    ...profile,
                    ...form,
                  });
                  toast.success("Profile saved");
                }}
              >
                Save Changes
              </Button>
            </div>
          </Card>

          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-md bg-muted p-2">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg text-foreground sm:text-xl">
                Notifications
              </h3>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm text-foreground sm:text-base">
                    Email Notifications
                  </h4>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Receive updates about new loads
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={handleEmailNotificationsChange}
                  className="flex-shrink-0"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm text-foreground sm:text-base">
                    Load Alerts
                  </h4>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Get notified about saved load updates
                  </p>
                </div>
                <Switch
                  checked={loadAlerts}
                  onCheckedChange={handleLoadAlertsChange}
                  className="flex-shrink-0"
                />
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="text-sm text-foreground">
                  Unread notifications:{" "}
                  {notifications.filter((item) => !item.read).length}
                </p>
                <Button
                  variant="ghost"
                  className="mt-2 h-9 px-0 text-foreground hover:bg-transparent hover:text-muted-foreground"
                  onClick={markAllNotificationsRead}
                >
                  Mark notifications as read
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-md bg-muted p-2">
                <Moon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg text-foreground sm:text-xl">Appearance</h3>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-sm text-foreground sm:text-base">
                  Dark Mode
                </h4>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Toggle dark theme
                </p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                className="flex-shrink-0"
              />
            </div>
          </Card>

          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-md bg-muted p-2">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg text-foreground sm:text-xl">
                Access & Auth
              </h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="font-medium text-foreground">
                  {profile?.email || "No active email"}
                </p>
                <p className="mt-1 text-xs">Signed in through Supabase Auth.</p>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="font-medium text-foreground">
                  {isAdmin ? "Admin access enabled" : "Dispatcher access"}
                </p>
                <p className="mt-1 text-xs">
                  Role: {profile?.role || "not assigned"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="font-medium text-foreground">User ID</p>
                <p className="mt-1 break-all text-xs">
                  {currentUserId || "Session is not linked yet"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-md bg-muted p-2">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg text-foreground sm:text-xl">
                Production Status
              </h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="font-medium text-foreground">Load Sync</p>
                <p className="mt-1 text-xs">
                  {lastLoadsSync
                    ? new Date(lastLoadsSync).toLocaleString("en-US")
                    : "Waiting for first successful sync"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
