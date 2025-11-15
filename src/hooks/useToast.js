// Prima, crea un hook riutilizzabile per i toast: hooks/useToast.js (o simile)
import { Toast } from "toastify-react-native";

export const useToast = () => {
  const showToast = (type = "success", message, options = {}) => {
    Toast.show({
      type,
      text1: message,
      position: "top", // Sovrascrive globale se necessario
      visibilityTime: 4000,
      ...options, // Es. text2 per sottotitolo, onPress, etc.
    });
  };

  return { showToast };
};
