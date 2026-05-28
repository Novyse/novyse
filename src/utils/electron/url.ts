export function getElectronUrl(): string | null {
  if (typeof window !== "undefined") {
    try {
      if (
        (window as any).electron &&
        (window as any).electron.getLocalServerUrl
      ) {
        const url = (window as any).electron.getLocalServerUrl();
        if (url) {
          return url;
        }
      }
    } catch (e) {}
  }
  return null;
}
