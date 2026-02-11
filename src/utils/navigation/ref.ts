import {
  createNavigationContainerRef,
  NavigationContainerEventMap,
  StackActions,
} from "@react-navigation/native";

export const detailNavigationRef = createNavigationContainerRef<any>();

let listeners: ((isEmpty: boolean) => void)[] = [];

export const detailsNavigator = {
  navigate: (name: string, params?: any) => {
    if (detailNavigationRef.isReady()) {
      detailNavigationRef.navigate(name, params);
    }
  },
  push: (name: string, params?: any) => {
    if (detailNavigationRef.isReady()) {
      detailNavigationRef.dispatch(StackActions.push(name, params));
    }
  },
  goBack: () => {
    if (detailNavigationRef.isReady() && detailNavigationRef.canGoBack()) {
      detailNavigationRef.goBack();
    }
  },
  canGoBack: () => {
    return detailNavigationRef.isReady() && detailNavigationRef.canGoBack();
  },
  getCurrentRoute: () => {
    if (detailNavigationRef.isReady()) {
      return detailNavigationRef.getCurrentRoute();
    }
    return null;
  },
  isEmpty: () => {
    const route = detailsNavigator.getCurrentRoute();
    return !route || route.name === "Empty";
  },
  subscribe: (callback: (isEmpty: boolean) => void) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter((l) => l !== callback);
    };
  },
  notify: (isEmpty: boolean) => {
    listeners.forEach((l) => l(isEmpty));
  },
  addListener: (
    event: String,
    callback: (data: any) => void,
  ) => {
    detailNavigationRef.addListener(event as keyof NavigationContainerEventMap, callback);
  },
};
