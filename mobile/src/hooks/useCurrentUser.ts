import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { getStoredUser, type AuthUser } from '@/services/authStorage';

export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const stored = await getStoredUser();
      setUser(stored);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  return { user, loading, reloadUser: loadUser };
}
