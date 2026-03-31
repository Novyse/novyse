import { useState, useEffect, useCallback } from "react";
import authUtils from "@/src/utils/welcome/auth";

/**
 * Custom hook to track authentication session status.
 * Replaces the need for a global AuthContext for basic status tracking.
 */
export const useAuthSession = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userUUID, setUserUUID] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const loggedIn = await authUtils.isLoggedIn();
      const uuid = await authUtils.getUserUUID();
      setIsLoggedIn(loggedIn);
      setUserUUID(uuid);
    } catch (error) {
      console.error("Session check error:", error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return { 
    isLoggedIn, 
    isLoading, 
    userUUID, 
    checkSession 
  };
};

export default useAuthSession;
