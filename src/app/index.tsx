import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import auth from '@/src/utils/welcome/auth';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAndRedirect = async () => {
      const loggedIn = await auth.isLoggedIn();
      if (loggedIn) {
        router.replace('/app');
      } else {
        router.replace('/welcome');
      }
    };
    checkAndRedirect();
  }, [router]);

  return null;
}