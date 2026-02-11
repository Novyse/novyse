import React, { createContext, useContext, useState, useEffect } from "react";
import auth from "@/src/utils/welcome/auth";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const refreshLoginStatus = async () => {
    const loggedIn = await auth.isLoggedIn();
    setIsLoggedIn(loggedIn);
  };

  useEffect(() => {
    refreshLoginStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, refreshLoginStatus }}>
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
