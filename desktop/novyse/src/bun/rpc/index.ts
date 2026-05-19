import { defineElectrobunRPC } from "electrobun/bun";
import type { AppRPC } from "../../../../../src/types/rpc";
import { handleExecuteDbQuery } from "./executeDbQuery";
import {
  handleSecureStoreSet,
  handleSecureStoreGet,
  handleSecureStoreDelete,
} from "./secureStore";
import { handleOpenFileDialog } from "./openFileDialog";
import { handleOpenFile } from "./openFile";

const rpcHandlers = {
  executeDbQuery: handleExecuteDbQuery,
  secureStoreSet: handleSecureStoreSet,
  secureStoreGet: handleSecureStoreGet,
  secureStoreDelete: handleSecureStoreDelete,
  openFileDialog: handleOpenFileDialog,
  openFile: handleOpenFile,
};

export const rpc = defineElectrobunRPC<AppRPC, "bun">("bun", {
  handlers: {
    requests: rpcHandlers,
  },
});
