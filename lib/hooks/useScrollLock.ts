"use client";

import { useEffect } from "react";

// Module-level ref count so nested/simultaneous overlays (e.g. a confirm
// dialog opened from within a drawer) don't fight over restoring scroll.
let lockCount = 0;
let savedScrollY = 0;

/**
 * Fa que, en alliberar-se el bloqueig, la pagina vagi a parar a aquest element
 * en lloc de tornar on era.
 *
 * Serveix per navegar a una ancora des de dins d'un overlay. Amb el body a
 * `position: fixed` el salt del navegador cap a `#botiga` no mou res, i el
 * `scrollTo` de restauracio de sota el rematava tornant a la posicio de
 * partida: el resultat era que clicar un enllac del menu no anava enlloc.
 *
 * Enlloc de competir amb aquesta restauracio amb un `setTimeout` -- que depen
 * de quan React buidi els efectes i no es fiable --, li canviem la destinacio.
 * Aixi hi ha un sol `scrollTo` i sempre guanya el bo.
 */
export function restoreScrollTo(target: Element): void {
  // Amb el body fixat la pagina no pot desplacar-se i `window.scrollY` val 0,
  // aixi que la posicio de l'element dins del document es la seva posicio dins
  // del viewport mes el desplacament que el bloqueig te desat.
  savedScrollY += target.getBoundingClientRect().top;
}

/**
 * Locks page scroll while `active` is true. Uses position:fixed on body
 * instead of overflow:hidden — iOS Safari ignores overflow:hidden on body
 * and still allows background scroll/rubber-banding under a fixed overlay.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const { style } = document.body;
      style.position = "fixed";
      style.top = `-${savedScrollY}px`;
      style.left = "0";
      style.right = "0";
      style.overflow = "hidden";
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        const { style } = document.body;
        style.position = "";
        style.top = "";
        style.left = "";
        style.right = "";
        style.overflow = "";
        // Two-arg scrollTo respects CSS `scroll-behavior: smooth` (globals.css
        // sets it on <html> for anchor nav), which would animate this restore
        // into a visible glide back to the reading position instead of an
        // instant snap — force it instant regardless of that setting.
        window.scrollTo({ top: savedScrollY, left: 0, behavior: "instant" });
      }
    };
  }, [active]);
}
