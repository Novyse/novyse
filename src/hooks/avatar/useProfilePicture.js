import { useEffect, useState } from "react";

import database from "@/src/utils/storage/database";

import useUriResolver from "@/src/hooks/file/useUriResolver";

const useProfilePicture = (uuid, uri) => {
  const [ref, setRef] = useState(null);

  useEffect(() => {
    const fetchRef = async () => {
      if (uri) {
        setRef(null);
        return;
      }
      if (!uuid) return;
      try {
        
        const fetchedRef = await database.file.get.ref(uuid);
        setRef(fetchedRef);
        return;
      } catch (error) {
        console.error("Profile picture ref fetch error:", error);
      }
    };
    fetchRef();
  }, [uuid, uri]);

  const { uri: resolvedUriFromHook } = useUriResolver(ref);

  if (uri) {
    return { uri };
  }
  return { uri: resolvedUriFromHook };
};

export default useProfilePicture;
