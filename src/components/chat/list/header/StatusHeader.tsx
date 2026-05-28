import React from "react";
import useNetworkStore from "@/src/context/NetworkContext";
import StatusMessage from "@/src/components/StatusMessage";
import { useTranslation } from "react-i18next";
import { useScreen } from "@/src/context/ScreenContext";
import useWindowSizeStore from "@/src/context/WindowSizeContext";

const StatusHeader = () => {
  const {
    isConnected,
    isSynced,
    isSocketConnected,
    apiError,
    syncRetryCountdown,
  } = useNetworkStore();
  const { t } = useTranslation();

  const { isSmallScreen } = useScreen();
  const { isSidebarCollapsed } = useWindowSizeStore();
  const showCollapsed = isSidebarCollapsed && !isSmallScreen;

  let message: string | null = null;
  let type: "info" | "warning" | "error" = "info";
  let translationKey: string | null = null;

  if (!isConnected) {
    translationKey = "chat.statusBanner.offline";
    type = "error";
  } else if (!isSynced) {
    message = t("chat.statusBanner.syncFailed", {
      count: syncRetryCountdown > 0 ? syncRetryCountdown : 0,
    });
    type = "warning";
  } else if (!isSocketConnected) {
    translationKey = "chat.statusBanner.socketDisconnected";
    type = "warning";
  } else if (apiError) {
    message = apiError;
    type = "error";
  }

  if (!translationKey && !message) return null;

  return (
    <StatusMessage
      type={type}
      translationKey={translationKey as string}
      content={message ? [message] : undefined}
      closable={false}
      iconOnly={showCollapsed}
    />
  );
};

export default StatusHeader;
