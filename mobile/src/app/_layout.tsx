import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';

import { headerTheme } from '@/theme/tokens';
import { HeaderBackButton } from '@/components/header-actions';

import '../../global.css';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          ...headerTheme,
          headerBackVisible: false,
          headerLeft: (props) => <HeaderBackButton canGoBack={props.canGoBack} />,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="signup" options={{ title: 'Cadastro' }} />
        <Stack.Screen
          name="organizer"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="user" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="diagnostics"
          options={{ title: 'Diagnóstico', presentation: 'modal' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
