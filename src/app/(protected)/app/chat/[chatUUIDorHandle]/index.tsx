import { Redirect, useLocalSearchParams } from "expo-router";

export default function ChatBaseRoute() {
  const { chatUUIDorHandle } = useLocalSearchParams();
  return <Redirect href={`/app/chat/${chatUUIDorHandle}/0`} />;
}
