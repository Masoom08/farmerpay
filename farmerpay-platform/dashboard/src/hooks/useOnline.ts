"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * useOnline — tracks `navigator.onLine` via window events.
 *
 * Returns `{ isOnline, lastOnlineAt }`.
 * - `lastOnlineAt` is an ISO string captured when the browser last went online.
 */
export interface OnlineState {
  isOnline: boolean;
  /** ISO timestamp of last known online moment */
  lastOnlineAt: string | null;
}

export function useOnline(): OnlineState {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<string | null>(() =>
    typeof navigator !== "undefined" && navigator.onLine
      ? new Date().toISOString()
      : null,
  );

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineAt(new Date().toISOString());
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, lastOnlineAt };
}

export default useOnline;
