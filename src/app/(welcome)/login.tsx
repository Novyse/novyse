import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

import auth from "@/src/utils/welcome/auth";
import gateway from "@/src/utils/backend-services/api-gateway";
import LoginForm from "@/src/components/welcome/login/LoginForm";

const LoginPassword = () => {
  const router = useRouter();
  const { refreshLoginStatus } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
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
      const {
        success,
        twofa,
        choose,
        methods,
        twoFactorToken,
        chooseTwoFactorToken,
      } = await gateway.auth.login(username, password);

      if (!success) {
        setError("Incorrect username or password");
        return;
      }

      if (!twofa) {
        if (await auth.initializeApp()) {
          await refreshLoginStatus();
          router.replace("/app");
        }
      } else {
        if (choose) {
          router.navigate({
            pathname: "/choose-verify",
            params: {
              verificationTypeList: methods,
              token: chooseTwoFactorToken,
            },
          });
        } else {
          router.navigate({
            pathname: "/verify",
            params: {
              verificationType: methods[0],
              token: twoFactorToken,
            },
          });
        }
      }
    } catch (e) {
      console.error(e);
      setError("Incorrect username or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithPasskey = () => {
    // logica passkey — da implementare
  };

  const handleSignup = () => {
    router.navigate("/signup");
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onLoginWithPasskey={handleLoginWithPasskey}
      onSignup={handleSignup}
      isLoading={isLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
    />
  );
};

export default LoginPassword;
