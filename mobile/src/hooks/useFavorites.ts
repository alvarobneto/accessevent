import { useEffect, useState } from 'react';

import {
  getStoredFavorites,
  subscribeFavorites,
  toggleStoredFavorite,
} from '@/services/favoritesStorage';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredFavorites().then((favs) => {
      setFavorites(favs);
      setLoading(false);
    });

    const unsubscribe = subscribeFavorites((updated) => {
      setFavorites(updated);
    });

    return unsubscribe;
  }, []);

  const toggleFavorite = async (eventId: string) => {
    const next = await toggleStoredFavorite(eventId);
    setFavorites(next);
  };

  const isFavorite = (eventId: string) => favorites.includes(eventId);

  return { favorites, toggleFavorite, isFavorite, loading };
}
