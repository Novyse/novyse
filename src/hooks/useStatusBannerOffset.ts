import useNetworkStore from "@/src/context/NetworkContext";
import { useScreen } from "@/src/context/ScreenContext";
import useWindowSizeStore from "@/src/context/WindowSizeContext";

const STATUS_BANNER_HEIGHT = 82;
const STATUS_BANNER_HEIGHT_COMPACT = 48;
const STATUS_BANNER_GAP = 10;


// To rename and add features as vocal chat banner, birthdays... 
export function useStatusBannerVisible(): boolean {
  const {
    isConnected,
    isSynced,
    isSocketConnected,
    apiError,
  } = useNetworkStore();

  return (
    !isConnected || !isSynced || !isSocketConnected || !!apiError
  );
}

export function useStatusBannerOffset(): number {
  const visible = useStatusBannerVisible();
  const { isSmallScreen } = useScreen();
  const { isSidebarCollapsed } = useWindowSizeStore();
  const iconOnly = isSidebarCollapsed && !isSmallScreen;

  if (!visible) return 0;

  const bannerHeight = iconOnly
    ? STATUS_BANNER_HEIGHT_COMPACT
    : STATUS_BANNER_HEIGHT;

  return bannerHeight + STATUS_BANNER_GAP;
}
