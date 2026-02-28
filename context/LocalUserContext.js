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
  const [description, setDescription] = useState("");
  const [birthday, setBirthday] = useState(null);
  const [region, setRegion] = useState(null);
  const [country, setCountry] = useState(null);

  useEffect(() => {
    const fetchLocalUserData = async () => {
      setIsLoading(true);
      const userUUID = await auth.getUserUUID();
      if (userUUID) {
        const localUser = await database.user.get.byUUID(userUUID);

        if (!localUser) {
          setIsLoading(false);
          return;
        }

        setUserUUID(userUUID);
        setProfilePictureUUID(localUser.profilePictureUUID);
        setName(localUser.name);
        setSurname(localUser.surname);
        setEmail(localUser.email);
        setDescription(localUser.description);
        setBirthday(localUser.birthday);
        setRegion(localUser.region);
        setCountry(localUser.country);
        setHandle(localUser.handle);
      }
      setIsLoading(false);
    };

    fetchLocalUserData();
  }, []);

  useEffect(() => {
    const handleUpdateProfile = async (data) => {
      if (data.userUUID === userUUID) {
        if (data.name) {
          setName(data.name);
        }
        if (data.surname) {
          setSurname(data.surname);
        }
        if (data.profilePictureUUID) {
          setProfilePictureUUID(data.profilePictureUUID);
        }
        if (data.description) {
          setDescription(data.description);
        }
        if (data.birthday) {
          setBirthday(data.birthday);
        }
        if (data.region) {
          setRegion(data.region);
        }
        if (data.country) {
          setCountry(data.country);
        }
      }
    };

    eventEmitter.getEmitter().on("user:profile:update", handleUpdateProfile);

    return () => {
      eventEmitter.getEmitter().off("user:profile:update", handleUpdateProfile);
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

        const localUser = await database.user.get.byUUID(uid);
        if (!mounted) return;
        if (localUser) {
          setUserUUID(uid);
          setProfilePictureUUID(localUser.profilePictureUUID);
          setName(localUser.name);
          setSurname(localUser.surname);
          setEmail(localUser.email);
          setHandle(localUser.handle);
          setDescription(localUser.description);
          setBirthday(localUser.birthday);
          setRegion(localUser.region);
          setCountry(localUser.country);
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
        username: handle,
        description,
        birthday,
        region,
        country,
        isLoading,
      }}
    >
      {children}
    </LocalUserContext.Provider>
  );
};

export const useLocalUserContext = () => React.useContext(LocalUserContext);
