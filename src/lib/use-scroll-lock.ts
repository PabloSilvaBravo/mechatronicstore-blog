import { useEffect } from "react";

let lockCount = 0;
let originalOverflow = "";

function applyLock() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function releaseLock() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    originalOverflow = "";
  }
}

/**
 * Lock body scroll mientras `active` sea true. Ref-counted globalmente
 * para que múltiples modales coexistan sin pisarse el overflow.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    applyLock();
    return () => releaseLock();
  }, [active]);
}
