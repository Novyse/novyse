export function getElectrobunUrl(): string | null {
  if (typeof window !== "undefined" && (window as any).localServerUrl) {
    return (window as any).localServerUrl;
  }
  return null;
}
