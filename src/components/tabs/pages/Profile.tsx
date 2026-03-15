import React from "react";

import useUserStore from "@/context/UserContext";

import Profile from "@/src/components/Profile";

const ProfilePage = () => {
  const userUUID = useUserStore((state) => state.localUserUUID);
  const name = useUserStore((state) => state.users[userUUID]?.name);
  const surname = useUserStore((state) => state.users[userUUID]?.surname);
  const username = useUserStore((state) => state.users[userUUID]?.handle);
  const profilePictureUUID = useUserStore(
    (state) => state.users[userUUID]?.profilePictureUUID,
  );
  const description = useUserStore(
    (state) => state.users[userUUID]?.description,
  );
  const birthday = useUserStore((state) => state.users[userUUID]?.birthday);
  const country = useUserStore((state) => state.users[userUUID]?.country);

  return (
    <Profile
      uuid={userUUID}
      name={name}
      surname={surname}
      username={username}
      profilePictureUUID={profilePictureUUID}
      description={description}
      birthday={birthday}
      country={country}
      isOnline={true}
    />
  );
};

export default ProfilePage;
