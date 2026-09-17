import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

function isTypingTarget(target) {
  if (!target) {
    return false;
  }

  const tagName = target.tagName?.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function focusLoadSearch() {
  const searchInput = document.querySelector("#load-search-input");

  if (searchInput instanceof HTMLElement) {
    searchInput.focus();
  }
}

export function useKeyboardShortcuts({
  isAdmin = false,
  isCommandPaletteOpen = false,
  onOpenCommandPalette,
  onCloseCommandPalette,
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingGoRef = useRef(false);
  const pendingGoTimerRef = useRef(null);

  useEffect(() => {
    const clearPendingGo = () => {
      pendingGoRef.current = false;

      if (pendingGoTimerRef.current) {
        window.clearTimeout(pendingGoTimerRef.current);
        pendingGoTimerRef.current = null;
      }
    };

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (event.key === "Escape" && isCommandPaletteOpen) {
        event.preventDefault();
        onCloseCommandPalette?.();
        clearPendingGo();
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        onOpenCommandPalette?.();
        clearPendingGo();
        return;
      }

      if (key === "/" && location.pathname === "/loads") {
        event.preventDefault();
        focusLoadSearch();
        clearPendingGo();
        return;
      }

      if (pendingGoRef.current) {
        const nextPathByKey = {
          d: "/dashboard",
          l: "/loads",
          a: isAdmin ? "/admin" : null,
        };
        const nextPath = nextPathByKey[key];

        if (nextPath) {
          event.preventDefault();
          navigate(nextPath);
        }

        clearPendingGo();
        return;
      }

      if (key === "g") {
        event.preventDefault();
        pendingGoRef.current = true;
        pendingGoTimerRef.current = window.setTimeout(clearPendingGo, 900);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPendingGo();
    };
  }, [
    isAdmin,
    isCommandPaletteOpen,
    location.pathname,
    navigate,
    onCloseCommandPalette,
    onOpenCommandPalette,
  ]);
}

export default useKeyboardShortcuts;
