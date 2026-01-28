import { Toast } from "toastify-react-native";

export const useToast = () => {
  const showToast = (type = "success", message, options = {}) => {
    Toast.show({
      type,
      text1: message,
      position: "top",
      visibilityTime: 4000,
      ...options,
    });
  };

  return { showToast };
};
