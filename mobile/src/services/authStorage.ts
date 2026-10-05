import * as SecureStore from 'expo-secure-store';

export type AuthUser = {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function saveSession(token: string, user?: AuthUser): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (user) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore storage errors in dev / unsupported environments
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    // Ignore storage delete errors
  }
}
