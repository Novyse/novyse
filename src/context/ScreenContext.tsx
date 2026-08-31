import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { useWindowDimensions } from "react-native";

interface ScreenContextType {
  isSmallScreen: boolean;
  isMediumScreen: boolean;
}

export const ScreenContext = createContext<ScreenContextType>({
  isSmallScreen: false,
  isMediumScreen: false,
});

interface ScreenProviderProps {
  children: ReactNode;
}

export const ScreenProvider = ({ children }: ScreenProviderProps) => {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const [isMediumScreen, setIsMediumScreen] = useState<boolean>(false);
  const { width } = useWindowDimensions();

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

export const useScreen = () => useContext(ScreenContext);
