import React from "react";

import useUserStore from "@/src/context/UserContext";

import Profile from "@/src/components/features/profile/ProfilePanel";

const defaultProfilePictureUUID = "00000000-0000-0000-0000-000000000000";

const ProfilePage = () => {
  const userUUID = useUserStore((state) => state.localUserUUID);
  const name = useUserStore((state) => state.users[userUUID]?.name);
  const surname = useUserStore((state) => state.users[userUUID]?.surname);
  const username = useUserStore((state) => state.users[userUUID]?.handle);
  const profilePictureUUID =
    useUserStore((state) => state.users[userUUID]?.profilePictureUUID) ||
    defaultProfilePictureUUID;
  const biography =
    useUserStore((state) => state.users[userUUID]?.biography) || "";
  const birthday =
    useUserStore((state) => state.users[userUUID]?.birthday) || "";
  const country = useUserStore((state) => state.users[userUUID]?.country) || "";

  return (
    <Profile
      uuid={userUUID}
      name={name}
      surname={surname}
      username={username}
      profilePictureUUID={profilePictureUUID}
      biography={biography}
      birthday={birthday}
      country={country}
      isOnline={true}
    />
  );
};

export default ProfilePage;
