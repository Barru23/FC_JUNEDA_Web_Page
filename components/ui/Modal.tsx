"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/hooks/useScrollLock";

/**
 * Behavior-only wrapper for the app's overlays (drawers, dialogs, fullscreen
 * menus): portals out of the section's stacking context, locks background
 * scroll for as long as it's mounted, and closes on Escape. Visual structure
 * (backdrop, panel, animation) stays with each caller — this only owns the
 * portal + scroll-lock + Escape + a11y attributes so that behavior isn't
 * copy-pasted at every call site.
 */
export function Modal({
  onClose,
  children,
  ariaLabel,
}: {
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  useScrollLock(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={ariaLabel}>
      {children}
    </div>,
    document.body
  );
}
