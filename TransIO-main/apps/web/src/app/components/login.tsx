import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Chrome,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "/logo.png";
import { useAppState } from "../context/app-state";
import { motion } from "motion/react";
import { toast } from "sonner";
import React from "react";

type AuthMode = "login" | "register";

interface LoginProps {
  initialMode?: AuthMode;
}

export function Login({ initialMode = "login" }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const navigate = useNavigate();
  const { authReady, isAuthenticated, login, register, loginWithGoogle } =
    useAppState();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!normalizedEmail) {
      toast.error("Email is required");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (mode === "register" && cleanName.length < 2) {
      toast.error("Full name is required");
      return;
    }

    try {
      setIsLoading(true);

      const result =
        mode === "login"
          ? await login({ email: normalizedEmail, password })
          : await register({
              name: cleanName,
              email: normalizedEmail,
              password,
            });

      if (result.needsVerification) {
        setAuthMessage(
          result.message || "Check your email to verify the account."
        );
        setMode("login");
        setPassword("");
        return;
      }

      if (result.success) {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthMessage("");
      setIsLoading(true);
      await loginWithGoogle();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google sign-in failed"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:h-20 sm:w-20">
            <ImageWithFallback
              src={logo}
              alt="TransIO Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
            TransIO
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Premium freight workspace for live load operations
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-xl shadow-black/10 backdrop-blur-sm sm:p-6">
          <div className="mb-5 grid grid-cols-2 rounded-md border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setAuthMessage("");
              }}
              className={`rounded px-3 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setAuthMessage("");
              }}
              className={`rounded px-3 py-2 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="mb-4 h-10 w-full rounded-md border-border bg-background text-sm text-foreground hover:bg-accent"
          >
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              or email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMessage && (
              <div
                role="status"
                className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-foreground"
              >
                {authMessage}
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-foreground">
                  Full Name
                </Label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-10 rounded-md border-border bg-input-background pl-10 text-foreground placeholder:text-muted-foreground"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-10 rounded-md border-border bg-input-background pl-10 text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-foreground">
                  Password
                </Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-medium text-foreground underline-offset-4 transition-colors hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    mode === "register"
                      ? "Create a secure password"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-10 rounded-md border-border bg-input-background px-10 text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
                className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <Label
                htmlFor="remember"
                className="cursor-pointer text-xs font-normal text-muted-foreground"
              >
                Keep me signed in on this device
              </Label>
            </div>

            <Button
              type="submit"
              className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading
                ? mode === "register"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "register"
                ? "Create Account"
                : "Sign In"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
