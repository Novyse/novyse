import React, { createContext, useContext, useState, useEffect } from "react";
import auth from "@/src/utils/welcome/auth";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLoginStatus = async () => {
    setIsLoading(true);
    const loggedIn = await auth.isLoggedIn();
    setIsLoggedIn(loggedIn);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshLoginStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, refreshLoginStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
