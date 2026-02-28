import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { detailsNavigator } from "@/src/utils/navigation/ref";

const NAV_STATE_KEY = "@detail_nav_state";

const DetailStackContext = createContext();

export const useDetailStackContext = () => {
  const context = useContext(DetailStackContext);
  if (!context) {
    throw new Error(
      "useDetailStackContext must be used within a DetailStackProvider",
    );
  }
  return context;
};

export const DetailStackProvider = ({ children, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(NAV_STATE_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (state.routes.length > 1) {
            const route = state.routes[state.index];
            if (route.name !== "Empty") {
              detailsNavigator.navigate(route.name, route.params);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load navigation state:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    console.log("Loading detail stack state...");
    loadState();
  }, []);

  const saveState = async (state) => {
    if (!state) return;
    try {
      await AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
      const isEmpty =
        state.routes.length === 1 && state.routes[0].name === "Empty";
      detailsNavigator.notify(isEmpty);
    } catch (error) {
      console.error("Failed to save navigation state:", error);
    }
  };

  return (
    <DetailStackContext.Provider value={{ isLoaded, saveState, ...props }}>
      {children}
    </DetailStackContext.Provider>
  );
};
