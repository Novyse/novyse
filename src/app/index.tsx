import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn === undefined || isLoggedIn === null) {
    return null;
  }
  return <Redirect href={isLoggedIn ? "/app" : "/welcome"} />;
}