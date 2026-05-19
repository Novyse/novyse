import { db } from "../db";
import type {
  DBQueryRequest,
  DBQueryResponse,
} from "../../../../../src/types/rpc";

export function handleExecuteDbQuery(request: DBQueryRequest): DBQueryResponse {
  try {
    const { method, query, params } = request;

    if (method === "exec") {
      db.exec(query);
      return { success: true };
    }

    const stmt = db.prepare(query);

    if (method === "all") {
      const data = stmt.all(...(params || []));
      return { success: true, data };
    } else if (method === "get") {
      const data = stmt.get(...(params || []));
      return { success: true, data };
    } else {
      const result = stmt.run(...(params || []));
      return { success: true, data: result };
    }
  } catch (error: any) {
    console.error("bun:sqlite error:", error.message);
    return {
      success: false,
      error: error.message || "Unknown db error",
    };
  }
}
