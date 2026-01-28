import { useEffect, useState } from "react";
import storage from "@/src/utils/storage/file";

const useUriResolver = (ref) => {
  const [uri, setUri] = useState(null);
  useEffect(() => {
    let isMounted = true;
    const resolveUri = async () => {
      if (!ref) return;
      try {
        const resolved = await storage.read(ref);
        if (isMounted && resolved) {
          setUri(resolved);
        }
      } catch (error) {
        console.error("URI resolution error:", error);
      }
    };
    resolveUri();
    return () => {
      isMounted = false;
    };
  }, [ref]);

  return { uri };
};

export default useUriResolver;
