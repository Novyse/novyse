import { useState } from "react";
import * as Clipboard from "expo-clipboard";

const useClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text) => {
    setCopied(false);
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  };

  return { copyToClipboard, copied };
};

export default useClipboard;
