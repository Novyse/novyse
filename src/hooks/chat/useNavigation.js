import { useRouter } from "expo-router";

const useNavigation = () => {
  const router = useRouter();

  const navigateToChat = (chatUUID) => {
    router.push(`/chat/${chatUUID}`);
  };
  const navigateToMessage = (chatUUID, messageID) => {
    router.push(`/chat/${chatUUID}?message=${messageID}`);
  };
  return {
    navigateToChat,
    navigateToMessage,
  };
};

export default useNavigation;
