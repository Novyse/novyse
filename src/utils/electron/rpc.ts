import { ElectronWindow, ElectronRPC } from "../../../desktop/types/electron";

export let electron: ElectronWindow | null = null;
export let rpc: ElectronRPC | null = null;

if (typeof window !== "undefined" && window.electron) {
  electron = window.electron;
  rpc = electron.rpc;
}
