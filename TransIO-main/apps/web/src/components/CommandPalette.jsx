import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Gauge,
  ListFilter,
  LifeBuoy,
  LogOut,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "../app/context/app-state";

function scoreCommand(command, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = `${command.label} ${command.keywords || ""}`.toLowerCase();
  let cursor = 0;

  for (const character of normalizedQuery) {
    cursor = haystack.indexOf(character, cursor);

    if (cursor === -1) {
      return false;
    }

    cursor += 1;
  }

  return true;
}

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { isAdmin, logout } = useAppState();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const focusSearch = () => {
    navigate("/loads");
    window.setTimeout(() => {
      const searchInput = document.querySelector("#load-search-input");

      if (searchInput instanceof HTMLElement) {
        searchInput.focus();
      }
    }, 80);
  };

  const commands = useMemo(() => {
    const baseCommands = [
      {
        label: "Go to Dashboard",
        hint: "Open the operations overview with load counts, activity, and quick actions.",
        shortcut: "G D",
        keywords: "home overview operations stats g d",
        icon: Gauge,
        action: () => navigate("/dashboard"),
      },
      {
        label: "Go to Loads",
        hint: "Jump to the live freight load board and review available lanes.",
        shortcut: "G L",
        keywords: "load board freight search g l",
        icon: ListFilter,
        action: () => navigate("/loads"),
      },
      {
        label: "Go to Settings",
        hint: "Manage account profile, role details, display mode, and workspace preferences.",
        shortcut: "Settings",
        keywords: "account preferences profile",
        icon: Settings,
        action: () => navigate("/settings"),
      },
      {
        label: "Go to Support",
        hint: "Open user support and contact the support team.",
        shortcut: "Support",
        keywords: "help support user ticket contact",
        icon: LifeBuoy,
        action: () => navigate("/support"),
      },
      {
        label: "Focus Search",
        hint: "Open the Loads page and place the cursor directly in the load search field.",
        shortcut: "/",
        keywords: "load search slash filter",
        icon: Search,
        action: focusSearch,
      },
      {
        label: "Logout",
        hint: "Sign out of the current TransIO session and return to the login page.",
        shortcut: "Session",
        keywords: "sign out session",
        icon: LogOut,
        action: async () => {
          try {
            await logout();
            navigate("/login", { replace: true });
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Logout failed"
            );
          }
        },
      },
    ];

    if (!isAdmin) {
      return baseCommands;
    }

    return [
      ...baseCommands.slice(0, 2),
      {
        label: "Go to Admin",
        hint: "Open admin stats, users, collector activity, and operational controls.",
        shortcut: "G A",
        keywords: "admin panel stats g a",
        icon: Shield,
        action: () => navigate("/admin"),
      },
      {
        label: "Go to Users",
        hint: "Review registered users, roles, and team account records.",
        shortcut: "Users",
        keywords: "admin users team accounts",
        icon: Users,
        action: () => navigate("/admin/users"),
      },
      ...baseCommands.slice(2),
    ];
  }, [isAdmin, logout, navigate]);

  const filteredCommands = useMemo(() => {
    return commands.filter((command) => scoreCommand(command, query));
  }, [commands, query]);
  const selectedCommand = filteredCommands[selectedIndex];

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (selectedIndex > filteredCommands.length - 1) {
      setSelectedIndex(Math.max(filteredCommands.length - 1, 0));
    }
  }, [filteredCommands.length, selectedIndex]);

  if (!open) {
    return null;
  }

  const runCommand = async (command) => {
    onOpenChange(false);
    await command.action();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) =>
        filteredCommands.length === 0
          ? 0
          : (current + 1) % filteredCommands.length
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) =>
        filteredCommands.length === 0
          ? 0
          : (current - 1 + filteredCommands.length) % filteredCommands.length
      );
      return;
    }

    if (event.key === "Enter" && filteredCommands[selectedIndex]) {
      event.preventDefault();
      runCommand(filteredCommands[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-3 pt-24 backdrop-blur-xl sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-zinc-950/92 text-white shadow-2xl shadow-black/40"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-white/55" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            placeholder="Search commands..."
          />
          
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid max-h-[24rem] min-h-72 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-white/50">
                No commands foundxcxkk
              </div>
            ) : (
              filteredCommands.map((command, index) => (
                <button
                  key={command.label}
                  type="button"
                  title={command.hint}
                  onClick={() => runCommand(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onFocus={() => setSelectedIndex(index)}
                  className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    index === selectedIndex
                      ? "bg-white text-black shadow-lg shadow-white/10"
                      : "text-white/82 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
                      index === selectedIndex
                        ? "border-black/10 bg-black text-white"
                        : "border-white/10 bg-white/5 text-white/72 group-hover:border-white/20 group-hover:text-white"
                    }`}
                  >
                    {React.createElement(command.icon, {
                      className: "h-4 w-4 shrink-0",
                    })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{command.label}</span>
                      <span
                        className={`hidden rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:inline-flex ${
                          index === selectedIndex
                            ? "border-black/15 bg-black/5 text-black/65"
                            : "border-white/10 bg-white/5 text-white/42"
                        }`}
                      >
                        {command.shortcut}
                      </span>
                    </span>
                    <span
                      className={`mt-1 line-clamp-2 text-xs leading-5 sm:hidden ${
                        index === selectedIndex
                          ? "text-black/65"
                          : "text-white/45"
                      }`}
                    >
                      {command.hint}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <aside className="hidden border-l border-white/10 bg-white/[0.03] p-4 sm:block">
            {selectedCommand ? (
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white text-black shadow-lg shadow-white/10">
                    {React.createElement(selectedCommand.icon, {
                      className: "h-5 w-5",
                    })}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    Command hint
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {selectedCommand.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/62">
                    {selectedCommand.hint}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
                    Shortcut
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedCommand.shortcut}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-white/42">
                Hover a command to see details
              </div>
            )}
          </aside>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-white/45">
          <span className="rounded border border-white/10 px-1.5 py-0.5">
            Ctrl K
          </span>
          <span className="rounded border border-white/10 px-1.5 py-0.5">
            / Search
          </span>
          <span className="rounded border border-white/10 px-1.5 py-0.5">
            G D Dashboard
          </span>
          <span className="rounded border border-white/10 px-1.5 py-0.5">
            G L Loads
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
