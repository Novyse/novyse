import { createNavigationContainerRef } from "expo-router/react-navigation";

export const tabNavigationRef = createNavigationContainerRef<any>();

export const tabNavigator = {
  navigate: (name: string, params?: any) => {
    if (tabNavigationRef.isReady()) {
      tabNavigationRef.navigate(name, params);
    }
  },
  goBack: () => {
    if (tabNavigationRef.isReady() && tabNavigationRef.canGoBack()) {
      tabNavigationRef.goBack();
    }
  },
  getCurrentRoute: () => {
    if (tabNavigationRef.isReady()) {
      return tabNavigationRef.getCurrentRoute();
    }
    return null;
  },
};
