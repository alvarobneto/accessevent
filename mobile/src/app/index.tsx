import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';

import { getStoredToken } from '@/services/authStorage';

export default function Index() {
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getStoredToken();
        if (token) {
          router.replace('/user');
        } else {
          router.replace('/splash');
        }
      } catch {
        router.replace('/splash');
      }
    }

    checkAuth();
  }, []);

  return <Redirect href="/splash" />;
}
