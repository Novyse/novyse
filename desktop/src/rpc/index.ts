import { ipcMain } from "electron";
import { handleExecuteDbQuery } from "./executeDbQuery";
import {
  handleSecureStoreSet,
  handleSecureStoreGet,
  handleSecureStoreDelete,
} from "./secureStore";
import { handleOpenFileDialog } from "./openFileDialog";
import { handleOpenFile } from "./openFile";
import { handleShowNotification } from "./notifications";

export function registerRpcHandlers() {
  ipcMain.handle("executeDbQuery", async (event, request) => {
    return handleExecuteDbQuery(request);
  });

  ipcMain.handle("secureStoreSet", async (event, request) => {
    return handleSecureStoreSet(request);
  });

  ipcMain.handle("secureStoreGet", async (event, request) => {
    return handleSecureStoreGet(request);
  });

  ipcMain.handle("secureStoreDelete", async (event, request) => {
    return handleSecureStoreDelete(request);
  });

  ipcMain.handle("openFileDialog", async (event, request) => {
    return handleOpenFileDialog(request);
  });

  ipcMain.handle("openFile", async (event, request) => {
    return handleOpenFile(request);
  });

  ipcMain.handle("showNotification", async (event, request) => {
    return handleShowNotification(request);
  });
}
