import { authApi } from "../config";

export const logout = async (): Promise<boolean> => {
  try {
    const response = await authApi.post("/auth/logout", null, {
      withCredentials: true,
    });

    if (response.data.success) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error logging out:", error);
    return false;
  }
};
