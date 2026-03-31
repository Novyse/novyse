import { createContext, useState, useEffect, useContext } from "react";
import { useWindowDimensions } from "react-native";

export const ScreenContext = createContext();

export const ScreenProvider = ({ children }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { height, width } = useWindowDimensions();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(width < 768);
    };

    checkScreenSize();
  }, [width]);

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
