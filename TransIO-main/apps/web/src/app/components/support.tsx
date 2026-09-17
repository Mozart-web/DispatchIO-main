import React, { useState } from "react";
import {
  CheckCircle2,
  LifeBuoy,
  Mail,
  MessageSquare,
  Send,
  Users,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useAppState } from "../context/app-state";
import { toast } from "sonner";

const supportEmail = "mozartmoreka864@gmail.com";

export function Support() {
  const { profile } = useAppState();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const isSupportConsole =
    profile?.role === "support" || profile?.role === "admin";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    const mailto = new URL(`mailto:${supportEmail}`);
    mailto.searchParams.set("subject", subject.trim());
    mailto.searchParams.set(
      "body",
      [
        message.trim(),
        "",
        `Name: ${profile?.name || ""}`,
        `Email: ${profile?.email || ""}`,
      ].join("\n")
    );

    window.location.href = mailto.toString();
    toast.success("Support request prepared");
  };

  return (
    <div className="min-h-full space-y-5 bg-background p-4 sm:p-6 lg:p-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {isSupportConsole ? "Support console" : "Support"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
              {isSupportConsole ? "User Support" : "Contact Support"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {isSupportConsole
                ? "Review user-facing support details and respond from the shared support inbox."
                : "Send load, account, billing, or access questions to the support team."}
            </p>
          </div>

          <div className="rounded-md border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {profile?.email || "User"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="rounded-lg border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              New Request
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="supportName">Name</Label>
                <Input
                  id="supportName"
                  value={profile?.name || ""}
                  readOnly
                  className="rounded-md border-border bg-muted text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supportEmail">Email</Label>
                <Input
                  id="supportEmail"
                  value={profile?.email || ""}
                  readOnly
                  className="rounded-md border-border bg-muted text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supportSubject">Subject</Label>
              <Input
                id="supportSubject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Load issue, account access, billing..."
                className="rounded-md border-border bg-input-background text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supportMessage">Message</Label>
              <Textarea
                id="supportMessage"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write the details here"
                className="min-h-36 rounded-md border-border bg-input-background text-foreground"
              />
            </div>

            <Button
              type="submit"
              className="h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="mr-2 h-4 w-4" />
              Send to Support
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Support Channels
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-foreground hover:bg-accent"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                {supportEmail}
              </a>
            </div>
          </Card>

          {isSupportConsole && (
            <Card className="rounded-lg border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Console Access
                </h2>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  User support role enabled
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Shared inbox route available
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
