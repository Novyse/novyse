import AsyncStorage from "@react-native-async-storage/async-storage";

const setAccessToken = async (accessToken) => {
  try {
    await AsyncStorage.setItem("accessToken", String(accessToken));
    console.log("Access token stored successfully");
  } catch (error) {
    console.log("Error storing access token:", error);
  }
};

const setBothTokens = async (accessToken, refreshToken) => {
  try {
    await AsyncStorage.setItem("accessToken", String(accessToken));
    await AsyncStorage.setItem("refreshToken", String(refreshToken));
    console.log("Both tokens stored successfully");
  } catch (error) {
    console.log("Error storing tokens:", error);
  }
};

const getAccessToken = async () => {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    return token;
  } catch (error) {
    console.log("Error retrieving access token:", error);
    return null;
  }
};

const getRefreshToken = async () => {
  try {
    const token = await AsyncStorage.getItem("refreshToken");
    return token;
  } catch (error) {
    console.log("Error retrieving refresh token:", error);
    return null;
  }
};

export default {
  setAccessToken,
  setBothTokens,
  getAccessToken,
  getRefreshToken,
};
