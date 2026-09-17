import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type Session as SupabaseSession,
  type User as SupabaseUser,
} from "@supabase/supabase-js";
import { type Load } from "../data/loads";
import { fetchLoads } from "../lib/api";
import { supabase } from "../../lib/supabase";

export type UserRole = "admin" | "dispatcher" | "carrier" | "support" | "user";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

export interface UserProfile {
  id: string | null;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  company: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  needsVerification?: boolean;
  isAdmin?: boolean;
}

interface AppStateValue {
  allLoads: Load[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  authReady: boolean;
  profileLoading: boolean;
  authError: string;
  darkMode: boolean;
  savedLoadIds: string[];
  bookedLoadIds: string[];
  notifications: AppNotification[];
  searchQuery: string;
  currentProfile: UserProfile | null;
  profile: UserProfile | null;
  currentUserId: string | null;
  unreadNotifications: number;
  savedLoads: Load[];
  bookedLoads: Load[];
  isLoadingLoads: boolean;
  loadsError: string;
  lastLoadsSync: string | null;
  login: (payload: { email: string; password: string }) => Promise<AuthResult>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  setSearchQuery: (value: string) => void;
  toggleSavedLoad: (loadId: string) => boolean;
  bookLoad: (loadId: string) => boolean;
  updateProfile: (payload: UserProfile) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  refreshLoads: () => Promise<void>;
}

const STORAGE_KEYS = {
  darkMode: "transio-dark-mode",
  saved: "transio-saved-loads",
  booked: "transio-booked-loads",
  notifications: "transio-notifications",
} as const;

const defaultNotifications: AppNotification[] = [];
const seededNotificationIds = new Set(["n-1", "n-2"]);

const defaultProfile: UserProfile = {
  id: null,
  role: "dispatcher",
  name: "Dispatcher",
  email: "",
  phone: "",
  company: "TransIO Logistics",
};

const AppStateContext = createContext<AppStateValue | null>(null);

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function createNotification(title: string, description: string): AppNotification {
  return {
    id: `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    description,
    createdAt: "Just now",
    read: false,
  };
}

function removeSeededNotifications(notifications: AppNotification[]) {
  return notifications.filter((notification) => {
    return !seededNotificationIds.has(notification.id);
  });
}

export function normalizeRole(role?: string | null): UserRole {
  if (
    role === "admin" ||
    role === "carrier" ||
    role === "dispatcher" ||
    role === "support" ||
    role === "user"
  ) {
    return role;
  }

  return "user";
}

export function formatRoleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  if (normalized === "admin") {
    return "Admin";
  }

  if (normalized === "carrier") {
    return "Carrier";
  }

  if (normalized === "support") {
    return "Support";
  }

  if (normalized === "user") {
    return "User";
  }

  return "Dispatcher";
}

function normalizeProfile(profile: Partial<UserProfile> | null | undefined): UserProfile {
  if (!profile) {
    return defaultProfile;
  }

  return {
    ...defaultProfile,
    ...profile,
    role: normalizeRole(profile.role),
  };
}

function keepExistingIds(ids: string[], loads: Load[]) {
  return ids.filter((id) => loads.some((load) => load.id === id));
}

function profileNameFromUser(user: SupabaseUser) {
  const metadata = user.user_metadata || {};
  const emailName = user.email?.split("@")[0]?.replace(/[._-]/g, " ");

  return (
    metadata.full_name ||
    metadata.name ||
    metadata.preferred_username ||
    emailName ||
    "Dispatcher"
  );
}

async function loadProfileForSupabaseUser(user: SupabaseUser) {
  const email = user.email || "";
  const fallbackProfile = normalizeProfile({
    id: user.id,
    email,
    name: profileNameFromUser(user),
    company: user.user_metadata?.company || defaultProfile.company,
    role: "dispatcher",
  });

  if (!supabase) {
    return fallbackProfile;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (data) {
    return normalizeProfile({
      id: data.id,
      email: data.email || email,
      name: data.full_name || fallbackProfile.name,
      phone: data.phone || fallbackProfile.phone,
      company: data.company_name || fallbackProfile.company,
      role: data.role,
    });
  }

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  const { data: createdProfile, error: createError } = await supabase
    .from("users")
    .insert({
      id: user.id,
      email,
      full_name: fallbackProfile.name,
      phone: fallbackProfile.phone,
      company_name: fallbackProfile.company,
      role: "dispatcher",
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return normalizeProfile({
    ...fallbackProfile,
    id: createdProfile?.id || user.id,
    email: createdProfile?.email || email,
    name: createdProfile?.full_name || fallbackProfile.name,
    phone: createdProfile?.phone || fallbackProfile.phone,
    company: createdProfile?.company_name || fallbackProfile.company,
    role: createdProfile?.role || fallbackProfile.role,
  });
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [darkMode, setDarkModeState] = useState(true);
  const [savedLoadIds, setSavedLoadIds] = useState<string[]>([]);
  const [bookedLoadIds, setBookedLoadIds] = useState<string[]>([]);
  const [notifications, setNotifications] =
    useState<AppNotification[]>(defaultNotifications);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allLoads, setAllLoads] = useState<Load[]>([]);
  const [isLoadingLoads, setIsLoadingLoads] = useState(false);
  const [loadsError, setLoadsError] = useState("");
  const [lastLoadsSync, setLastLoadsSync] = useState<string | null>(null);

  useEffect(() => {
    setDarkModeState(readStorage(STORAGE_KEYS.darkMode, true));
    setSavedLoadIds(readStorage(STORAGE_KEYS.saved, []));
    setBookedLoadIds(readStorage(STORAGE_KEYS.booked, []));
    setNotifications(
      removeSeededNotifications(
        readStorage(STORAGE_KEYS.notifications, defaultNotifications)
      )
    );

    const initializeAuth = async () => {
      try {
        if (!supabase) {
          setSession(null);
          setIsAuthenticated(false);
          setCurrentProfile(null);
          setAuthError("Supabase is not configured.");
          return;
        }

        setProfileLoading(true);
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        await applySession(data.session ?? null);
      } catch (error) {
        setAuthError(
          error instanceof Error ? error.message : "Authentication failed"
        );
      } finally {
        setAuthReady(true);
        setProfileLoading(false);
      }
    };

    initializeAuth();

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        applySession(nextSession ?? null)
          .catch((error) => {
            setAuthError(
              error instanceof Error ? error.message : "Authentication failed"
            );
          })
          .finally(() => {
            setAuthReady(true);
          });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const applySession = async (nextSession: SupabaseSession | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setCurrentProfile(null);
      setIsAuthenticated(false);
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);
    setAuthError("");

    try {
      const nextProfile = await loadProfileForSupabaseUser(nextSession.user);
      setCurrentProfile(nextProfile);
      setIsAuthenticated(true);
      return nextProfile;
    } catch (error) {
      setCurrentProfile(null);
      setIsAuthenticated(false);
      setAuthError(
        error instanceof Error ? error.message : "Profile could not be loaded"
      );
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    writeStorage(STORAGE_KEYS.darkMode, darkMode);
  }, [darkMode]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.saved, savedLoadIds);
  }, [savedLoadIds]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.booked, bookedLoadIds);
  }, [bookedLoadIds]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.notifications, notifications);
  }, [notifications]);

  const addNotification = (title: string, description: string) => {
    setNotifications((current) => [
      createNotification(title, description),
      ...current,
    ]);
  };

  const refreshLoads = async () => {
    try {
      setIsLoadingLoads(true);
      setLoadsError("");

      const loads = await fetchLoads();

      setAllLoads((current) => {
        if (current.length > 0 && loads.length > current.length) {
          const difference = loads.length - current.length;

          setNotifications((existing) => [
            createNotification(
              "New loads",
              `${difference} ta yangi load yuklandi.`
            ),
            ...existing,
          ]);
        }

        return loads;
      });

      setSavedLoadIds((current) => keepExistingIds(current, loads));
      setBookedLoadIds((current) => keepExistingIds(current, loads));
      setLastLoadsSync(new Date().toISOString());
    } catch (error) {
      setLoadsError(
        error instanceof Error
          ? error.message
          : "Loads could not be loaded from the backend"
      );
    } finally {
      setIsLoadingLoads(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    refreshLoads();

    const intervalId = window.setInterval(() => {
      refreshLoads();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated]);

  const savedLoads = useMemo(
    () => allLoads.filter((load) => savedLoadIds.includes(load.id)),
    [allLoads, savedLoadIds]
  );

  const bookedLoads = useMemo(
    () => allLoads.filter((load) => bookedLoadIds.includes(load.id)),
    [allLoads, bookedLoadIds]
  );

  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const profile = currentProfile;
  const currentUserId = currentProfile?.id ?? session?.user?.id ?? null;
  const isAdmin = currentProfile?.role === "admin";

  const login = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!supabase) {
      throw new Error("Supabase is not configured for authentication.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      const nextProfile = await applySession(data.session ?? null);

      return {
        success: true,
        isAdmin: nextProfile?.role === "admin",
      };
    }

    return { success: false, message: "Sign in did not return a user." };
  };

  const register = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    if (!supabase) {
      throw new Error("Supabase is not configured for registration.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
          company: defaultProfile.company,
        },
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (error) {
      throw error;
    }

    if (data.user && data.session) {
      const nextProfile = await applySession(data.session);

      return {
        success: true,
        isAdmin: nextProfile?.role === "admin",
      };
    }

    return {
      success: true,
      needsVerification: true,
      message: "Account created. Check your email to verify the account.",
    };
  };

  const loginWithGoogle = async () => {
    if (!supabase) {
      throw new Error("Supabase is not configured for Google authentication.");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
    };
  };

  const logout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    }

    setIsAuthenticated(false);
    setCurrentProfile(null);
    setSession(null);
  };

  const toggleDarkMode = () => {
    setDarkModeState((current) => !current);
  };

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
  };

  const toggleSavedLoad = (loadId: string) => {
    let saved = false;

    setSavedLoadIds((current) => {
      if (current.includes(loadId)) {
        addNotification("Removed from saved", `Load ${loadId} was removed.`);
        saved = false;
        return current.filter((id) => id !== loadId);
      }

      addNotification("Load saved", `Load ${loadId} was added to Saved Loads.`);
      saved = true;
      return [...current, loadId];
    });

    return saved;
  };

  const bookLoad = (loadId: string) => {
    let booked = false;

    setBookedLoadIds((current) => {
      if (current.includes(loadId)) {
        booked = false;
        return current;
      }

      addNotification("Load booked", `Load ${loadId} moved to My Loads.`);
      booked = true;
      return [...current, loadId];
    });

    return booked;
  };

  const updateProfile = (payload: UserProfile) => {
    setCurrentProfile(normalizeProfile(payload));
    addNotification("Profile updated", "Your account details were saved.");

    if (supabase && payload.id && payload.email) {
      supabase
        .from("users")
        .upsert(
          {
            id: payload.id,
            email: payload.email,
            full_name: payload.name,
            phone: payload.phone,
            company_name: payload.company,
          },
          { onConflict: "id" }
        )
        .then(({ error }) => {
          if (error) {
            setAuthError(error.message);
          }
        });
    }
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = useMemo<AppStateValue>(
    () => ({
      allLoads,
      isAuthenticated,
      isAdmin,
      authReady,
      profileLoading,
      authError,
      darkMode,
      savedLoadIds,
      bookedLoadIds,
      notifications,
      searchQuery,
      currentProfile,
      profile,
      currentUserId,
      unreadNotifications,
      savedLoads,
      bookedLoads,
      isLoadingLoads,
      loadsError,
      lastLoadsSync,
      login,
      register,
      loginWithGoogle,
      logout,
      toggleDarkMode,
      setDarkMode,
      setSearchQuery,
      toggleSavedLoad,
      bookLoad,
      updateProfile,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      refreshLoads,
    }),
    [
      allLoads,
      isAuthenticated,
      isAdmin,
      authReady,
      profileLoading,
      authError,
      darkMode,
      savedLoadIds,
      bookedLoadIds,
      notifications,
      searchQuery,
      currentProfile,
      currentUserId,
      unreadNotifications,
      savedLoads,
      bookedLoads,
      isLoadingLoads,
      loadsError,
      lastLoadsSync,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }

  return context;
}
