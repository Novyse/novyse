import React, { createContext, useState } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userUUID, setUserUUID] = useState(null);
  const [profilePictureUUID, setProfilePictureUUID] = useState(null);

  return (
    <UserContext.Provider
      value={{
        userUUID,
        setUserUUID,
        profilePictureUUID,
        setProfilePictureUUID,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
