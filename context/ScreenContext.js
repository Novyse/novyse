import { createContext, useState, useEffect, useContext } from "react";
import { useWindowDimensions } from "react-native";

export const ScreenContext = createContext();

export const ScreenProvider = ({ children }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isMediumScreen, setIsMediumScreen] = useState(false);
  const { height, width } = useWindowDimensions();

  const MOBILE_BREAKPOINT = 768;
  const TABLET_BREAKPOINT = 1024;

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(width < MOBILE_BREAKPOINT);
      setIsMediumScreen(
        width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      );
    };

    checkScreenSize();
  }, [width]);

  const value = {
    isSmallScreen,
    isMediumScreen,
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
