import React, { createContext, useState } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userUUID, setUserUUID] = useState(null);

  return (
    <UserContext.Provider
      value={{
        userUUID,
        setUserUUID,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
