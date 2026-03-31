import React, { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import authInit from "@/src/utils/welcome/auth";
import auth from "@/src/utils/backend-services/auth";
import LoginForm from "@/src/components/welcome/login/LoginForm";

const LoginPassword = () => {
  const router = useRouter();
  const {
    username: urlUsername,
    signedup: urlSignedup,
    type: urlType,
  } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string, captchaToken: string) => {
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
        if (await authInit.initializeApp()) {
          // data should contain accessToken (web) or sessionId (mobile) and userUUID
          await authInit.setLogin({
            userUUID: data.userUUID,
            accessToken: data.token,
            sessionId: data.session_id,
          });
          router.replace("/app");
        }
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

  const handleLoginWithPasskey = async (captchaToken: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const ok = await auth.signin.passkey(captchaToken);

      if (!ok.success) {
        setError(ok.error || "Passkey login failed");
        return;
      }

      const { data } = ok;
      if (await authInit.initializeApp()) {
        await authInit.setLogin({
          userUUID: data.userUUID,
          accessToken: data.token,
          sessionId: data.session_id,
        });
        router.replace("/app");
      }
    } catch (e: any) {
      console.error(e);
      setError("An unexpected error occurred during passkey login");
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
      onLoginWithPasskey={handleLoginWithPasskey}
      onSignup={handleSignup}
      isLoading={isLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      urlUsername={urlUsername as string}
      urlSignedup={urlSignedup === "true"}
      urlType={urlType as "opaque" | "passkey"}
    />
  );
};

export default LoginPassword;
