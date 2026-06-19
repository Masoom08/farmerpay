import { ReactNode, useEffect, useState} from "react";
import { AuthContext } from "../auth/auth.context";
import { getRefreshToken, clearSecureAuth} from "../lib/secure-storage";
import { getUser, clearUser} from "../lib/storage";
import { StoredUser } from "../types/auth.types";

interface Props {
  children: ReactNode;
}

export const AuthProvider = ({
  children,
}: Props) => {

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [user, setUser] =
    useState<StoredUser | null>(null);

  // RESTORE SESSION

  const restoreSession = async () => {
    try {

      const refreshToken =
        await getRefreshToken();

      const storedUser =
        await getUser<StoredUser>();

      if (
        refreshToken &&
        storedUser
      ) {
        setUser(storedUser);

        setIsAuthenticated(true);

      } else {
        setIsAuthenticated(false);
      }

    } catch (error) {

      console.log(
        "Restore session failed",
        error
      );

      setIsAuthenticated(false);

    } finally {

      setIsLoading(false);
    }
  };


  // LOGIN

  const login = (
    userData: StoredUser
  ) => {
    setUser(userData);

    setIsAuthenticated(true);
  };

  // LOGOUT
  const logout = async () => {

    await clearSecureAuth();

    await clearUser();

    setUser(null);

    setIsAuthenticated(false);
  };


  useEffect(() => {
    restoreSession();
  }, []);


  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};