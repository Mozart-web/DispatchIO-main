import { useState } from "react";
import { Link } from "react-router";
import { Mail, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email is required");
      setSuccess("");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured.");
      setSuccess("");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        throw resetError;
      }

      setSuccess("Password reset link sent. Check your email inbox.");
      toast.success("Password reset link sent");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Password reset email could not be sent"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl shadow-black/10 sm:p-6"
      >
        <Link
          to="/login"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Account recovery
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Forgot password?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we will send you a secure reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-sm text-foreground">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-md border-border bg-input-background pl-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-foreground"
            >
              {success}
            </div>
          )}

          <Button
            type="submit"
            className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? "Sending reset link..." : "Send Reset Link"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
