import React, { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import authInit from "@/src/utils/welcome/auth";
import auth from "@/src/utils/backend-services/auth";
import LoginForm from "@/src/components/features/welcome/login/LoginForm";

const LoginPassword = () => {
  const router = useRouter();
  const { username: urlUsername, signedup: urlSignedup } =
    useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (
    username: string,
    password: string,
    captchaToken: string,
  ) => {
    if (!username) {
      setError("Username cannot be empty");
      return;
    }
    if (!password) {
      setError("Password cannot be empty");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { success, requires2FA, twoFactorToken, data } =
        await auth.signin.opaque(username, password, captchaToken);

      if (!success) {
        setError("Incorrect username or password");
        return;
      }

      if (!requires2FA) {
        await authInit.setLogin(data.userUUID, data.sessionID, data.session_id);
        router.replace("/app");
      } else {
        router.navigate({
          pathname: "/verify",
          params: {
            token: twoFactorToken,
          },
        });
      }
    } catch (e) {
      console.error(e);
      setError("Incorrect username or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = () => {
    router.navigate("/signup");
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onSignup={handleSignup}
      isLoading={isLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      urlUsername={urlUsername as string}
      urlSignedup={urlSignedup === "true"}
    />
  );
};

export default LoginPassword;
