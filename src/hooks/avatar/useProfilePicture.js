import { useEffect, useState } from "react";
import { getProfilePictureUri } from "@/src/utils/avatar/profilePicture";

const useProfilePicture = (uuid, uri) => {
  const [resolvedUri, setResolvedUri] = useState(null);

  useEffect(() => {
    if (uri) {
      setResolvedUri(uri);
      return;
    }
    
    let isMounted = true;
    const fetchUri = async () => {
      const resultUri = await getProfilePictureUri(uuid);
      if (isMounted) {
        setResolvedUri(resultUri);
      }
    };
    fetchUri();
    
    return () => {
      isMounted = false;
    };
  }, [uuid, uri]);

  if (uri) {
    return { uri };
  }
  return { uri: resolvedUri };
};

export default useProfilePicture;
