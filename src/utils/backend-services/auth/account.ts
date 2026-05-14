import { authApi } from "../config";
import { getAuthToken } from "./token-manager";

/**
 * Delete the user's account.
 * Calls the DELETE /account endpoint on the auth service.
 * @returns {Promise<boolean>} true if the account was successfully deleted, false otherwise
 */
export const deleteAccount = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    const response = await authApi.delete("/account", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data && response.data.success) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting account:", error);
    return false;
  }
};
