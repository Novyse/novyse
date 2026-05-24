import Platform from "@/src/utils/device/type";

export let rpc: any = null;

if (Platform === "desktop" && typeof window !== "undefined") {
  if ((window as any).electron && (window as any).electron.rpc) {
    rpc = (window as any).electron.rpc;
  } else {
    console.warn("Electron IPC bridge not found on window.electron");
  }
}
