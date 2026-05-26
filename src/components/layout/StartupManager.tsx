import React, { useEffect, useRef, useState } from "react";
import settingsManager from "@/src/utils/global/SettingsManager";
import useCommsAction from "@/src/hooks/comms/useCommsAction";

interface StartupManagerProps {
  isReady: boolean | null;
}

export default function StartupManager({ isReady }: StartupManagerProps) {
  const [targetChat, setTargetChat] = useState<{
    uuid: string;
    sub: string | number;
  } | null>(null);

  const { join } = useCommsAction(targetChat?.uuid, targetChat?.sub);

  useEffect(() => {
    if (!isReady) return;

    const fetchSettings = async () => {
      try {
        const sys = (await settingsManager.getPageParameters(
          "settings.system",
        )) as any;

        if (sys?.joinCommsChatId) {
          setTargetChat({
            uuid: sys.joinCommsChatId,
            sub: sys.joinCommsSubId || 0,
          });
        }
      } catch (error) {
        console.error("[StartupManager] Error running actions:", error);
      }
    };

    fetchSettings();
  }, [isReady]);

  const hasJoined = useRef(false);
  useEffect(() => {
    if (targetChat && !hasJoined.current) {
      hasJoined.current = true;
      join();
    }
  }, [targetChat, join]);

  return null;
}
