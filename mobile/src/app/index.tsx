import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getStoredToken } from '@/services/authStorage';

export default function Index() {
  const [destination, setDestination] = useState<'/splash' | '/user' | null>(null);

  useEffect(() => {
    let mounted = true;

    getStoredToken()
      .then((token) => {
        if (mounted) setDestination(token ? '/user' : '/splash');
      })
      .catch(() => {
        if (mounted) setDestination('/splash');
      });

    return () => {
      mounted = false;
    };
  }, []);

  return destination ? <Redirect href={destination} /> : null;
}
