import { useEffect, useState } from "react";
import settingsManager from "@/src/utils/global/SettingsManager";
import useCommsAction from "@/src/hooks/comms/useCommsAction";

let hasJoinedGlobal = false;

export default function StartupManager() {
  const [targetChat, setTargetChat] = useState<{
    uuid: string;
    sub: string | number;
  } | null>(null);

  const { join } = useCommsAction(targetChat?.uuid, targetChat?.sub);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (targetChat && !hasJoinedGlobal) {
      hasJoinedGlobal = true;
      join();
    }
  }, [targetChat, join]);

  return null;
}
