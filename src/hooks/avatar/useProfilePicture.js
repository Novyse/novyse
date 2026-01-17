import { useEffect, useState, useContext } from "react";

import { UserContext } from "@/context/UserContext";

import Database from "@/src/utils/storage/database";

import useUriResolver from "@/src/hooks/file/useUriResolver";

const useProfilePicture = (uuid, uri, mySelf) => {
  const { profilePictureUUID } = useContext(UserContext);

  const [ref, setRef] = useState(null);

  useEffect(() => {
    const fetchRef = async () => {
      if (uri) {
        setRef(null);
        return;
      }
      if (mySelf) {
        const database = await Database.create();
        const fetchedRef = await database.file.get.ref(profilePictureUUID);
        setRef(fetchedRef);
        return;
      }
      if (!uuid) return;
      try {
        const database = await Database.create();
        const fetchedRef = await database.file.get.ref(uuid);
        setRef(fetchedRef);
        return;
      } catch (error) {
        console.error("Profile picture ref fetch error:", error);
      }
    };
    fetchRef();
  }, [uuid, uri, mySelf]);

  const { uri: resolvedUriFromHook } = useUriResolver(ref);

  if (uri) {
    return { uri };
  }
  return { uri: resolvedUriFromHook };
};

export default useProfilePicture;
