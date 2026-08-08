export const HEADER_ROW_HEIGHT = 50;
export const ICON_BUTTON_SIZE = 40;
export const HEADER_SHELL_PADDING = 10;
export const HEADER_INNER_PADDING = 5;
export const APP_HEADER_CONTENT_OFFSET =
  HEADER_SHELL_PADDING + HEADER_ROW_HEIGHT + HEADER_SHELL_PADDING;

/** Extra space below header before scroll content (settings sub-pages). */
export const SETTINGS_HEADER_SCROLL_PADDING = APP_HEADER_CONTENT_OFFSET + 15;

/** Comms banner below the main header row in chat list. */
export const COMMS_HEADER_OFFSET = 65;

export function getAppHeaderScrollPaddingTop(
  insetsTop: number,
  options?: {
    gap?: number;
    commsFooterOffset?: number;
    statusBannerOffset?: number;
  },
) {
  return (
    APP_HEADER_CONTENT_OFFSET +
    insetsTop +
    (options?.gap ?? 10) +
    (options?.commsFooterOffset ?? 0) +
    (options?.statusBannerOffset ?? 0)
  );
}
