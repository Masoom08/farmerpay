import { useState } from "react";
import { logout } from "../api/modules/auth.api";
import { clearAuth } from "../lib/storage";

export const useLogout = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      try {
        await logout();
      } catch {
        // Ignore 404 or API failure
      }

      await clearAuth();
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleLogout,
  };
};