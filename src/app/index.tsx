import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import SplashScreen from "@/src/components/SplashScreen";

export default function Index() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return <Redirect href={isLoggedIn ? "/app" : "/welcome"} />;
}