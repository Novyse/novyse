import { Unmatched } from "expo-router";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function CustomUnmatched() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return <Unmatched />;
}
