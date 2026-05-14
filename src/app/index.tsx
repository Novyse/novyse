import React from "react";
import { Redirect } from "expo-router";
import useAuthSession from "@/src/hooks/auth/useAuthSession";
import SplashScreen from "@/src/components/SplashScreen";

export default function Index() {
  const { isLoggedIn, isLoading } = useAuthSession();

  if (isLoading) {
    return <SplashScreen />;
  }

  return <Redirect href={isLoggedIn ? "/app" : "/welcome"} />;
}
