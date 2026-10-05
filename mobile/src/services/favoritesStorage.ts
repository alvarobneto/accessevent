import * as SecureStore from 'expo-secure-store';

const FAVORITES_KEY = 'userFavorites';

type Listener = (favorites: string[]) => void;
const listeners = new Set<Listener>();

let memoryFavorites: string[] | null = null;

export async function getStoredFavorites(): Promise<string[]> {
  if (memoryFavorites !== null) return memoryFavorites;
  try {
    const raw = await SecureStore.getItemAsync(FAVORITES_KEY);
    if (!raw) {
      memoryFavorites = [];
      return [];
    }
    const parsed = JSON.parse(raw);
    memoryFavorites = Array.isArray(parsed) ? parsed : [];
    return memoryFavorites;
  } catch {
    memoryFavorites = [];
    return [];
  }
}

export async function saveStoredFavorites(favorites: string[]): Promise<void> {
  memoryFavorites = favorites;
  listeners.forEach((fn) => fn(favorites));
  try {
    await SecureStore.setItemAsync(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage errors in dev / unsupported environments
  }
}

export async function toggleStoredFavorite(eventId: string): Promise<string[]> {
  const current = await getStoredFavorites();
  const exists = current.includes(eventId);
  const next = exists ? current.filter((id) => id !== eventId) : [...current, eventId];
  await saveStoredFavorites(next);
  return next;
}

export function subscribeFavorites(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
