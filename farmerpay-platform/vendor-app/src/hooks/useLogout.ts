import { useState } from "react";
import { logout  as logoutApi } from "../api/modules/auth.api";
import { useAuth } from "./useAuth";
import { clearSecureAuth } from "../lib/secure-storage";
import { clearUser } from "../lib/storage";

export const useLogout = () => {
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    setLoading(true);

    try {
      try {
        await logoutApi();
      } catch {
        // Ignore 404 or API failure
      }

      await logout()
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleLogout,
  };
};