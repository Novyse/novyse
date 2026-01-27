import React, { createContext, useEffect, useState } from "react";

import auth from "@/src/utils/welcome/auth";
import database from "@/src/utils/storage/database";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

export const LocalUserContext = createContext();

export const LocalUserProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  const [userUUID, setUserUUID] = useState(null);
  const [profilePictureUUID, setProfilePictureUUID] = useState(null);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");

  useEffect(() => {
    const fetchLocalUserData = async () => {
      setIsLoading(true);
      const userUUID = await auth.getUserUUID();
      if (userUUID) {
        
        const localUser = await database.user.get(userUUID);

        setUserUUID(userUUID);
        setProfilePictureUUID(localUser.profilePictureUUID);
        setName(localUser.name);
        setSurname(localUser.surname);
        setEmail(localUser.email);
        setHandle(localUser.handle);
      }
      setIsLoading(false);
    };

    fetchLocalUserData();
  }, []);

  useEffect(() => {
    const handleUpdateProfilePicture = async (data) => {
      if (data.userUUID === userUUID) {
        setProfilePictureUUID(data.profilePictureUUID);
      }
    };

    eventEmitter
      .getEmitter()
      .on("user:profile:picture:update", handleUpdateProfilePicture);

    return () => {
      eventEmitter
        .getEmitter()
        .off("user:profile:picture:update", handleUpdateProfilePicture);
    };
  }, [userUUID]);

  // This is a temporary solution to handle the case where the userUUID is not immediately available. Will be fixed for 1.0 release.
  useEffect(() => {
    if (userUUID) return;
    let mounted = true;
    const checkForUser = async () => {
      try {
        const uid = await auth.getUserUUID();
        if (!mounted || !uid) return;

        const localUser = await database.user.get(uid);
        if (!mounted) return;
        if (localUser) {
          setUserUUID(uid);
          setProfilePictureUUID(localUser.profilePictureUUID);
          setName(localUser.name);
          setSurname(localUser.surname);
          setEmail(localUser.email);
          setHandle(localUser.handle);
        }
      } catch (e) {
        // ignora errori e continua il polling
      }
    };
    checkForUser();
    const intervalId = setInterval(checkForUser, 1000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [userUUID]);

  return (
    <LocalUserContext.Provider
      value={{
        userUUID,
        profilePictureUUID,
        name,
        surname,
        email,
        handle,
        isLoading,
      }}
    >
      {children}
    </LocalUserContext.Provider>
  );
};
