export interface DBQueryRequest {
  method: "exec" | "run" | "all" | "get";
  query: string;
  params: any[];
}

export interface DBQueryResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export type AppRPC = {
  bun: {
    requests: {
      executeDbQuery: {
        params: DBQueryRequest;
        response: DBQueryResponse;
      };
      secureStoreSet: {
        params: SecureStoreSetRequest;
        response: SecureStoreSetResponse;
      };
      secureStoreGet: {
        params: SecureStoreGetRequest;
        response: SecureStoreGetResponse;
      };
      secureStoreDelete: {
        params: SecureStoreDeleteRequest;
        response: SecureStoreDeleteResponse;
      };
      openFileDialog: {
        params: OpenFileDialogRequest;
        response: OpenFileDialogResponse;
      };
      openFile: {
        params: OpenFileRequest;
        response: OpenFileResponse;
      };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {};
  };
};

export interface OpenFileDialogRequest {
  allowedFileTypes?: string;
  allowsMultipleSelection?: boolean;
}

export interface OpenFileDialogResponse {
  success: boolean;
  assets?: Array<{
    uri: string;
    name: string;
    size: number;
    mimeType: string;
  }>;
  error?: string;
}

export interface SecureStoreSetRequest {
  key: string;
  value: string;
}

export interface SecureStoreSetResponse {
  success: boolean;
  error?: string;
}

export interface SecureStoreGetRequest {
  key: string;
}

export interface SecureStoreGetResponse {
  success: boolean;
  value?: string;
  error?: string;
}

export interface SecureStoreDeleteRequest {
  key: string;
}

export interface SecureStoreDeleteResponse {
  success: boolean;
  error?: string;
}

export interface OpenFileRequest {
  fileRef: string;
}

export interface OpenFileResponse {
  success: boolean;
  error?: string;
}
