import { createContext, useState, useEffect, useContext } from "react";

export const ScreenContext = createContext();

export const ScreenProvider = ({ children }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const updateScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 768);
    };
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => {
      window.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  const value = {
    isSmallScreen,
  };

  return (
    <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>
  );
};

export const useScreen = () => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error("useScreen must be used within a ScreenProvider");
  }
  return context;
};
