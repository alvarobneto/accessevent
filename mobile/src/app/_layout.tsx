import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Cada peso é importado pelo seu próprio subpath, e não pelo índice do pacote:
// o índice reexporta os 18 arquivos da família e o Metro embutiria ~5 MB de
// fontes que o app nunca carrega. Só os quatro pesos do `design.md` entram no
// bundle.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

import { headerTheme } from '@/theme/tokens';

import '../../global.css';

/**
 * Layout raiz. O app tem três áreas separadas:
 *
 * - `/`          escolha de papel (organizador ou usuário)
 * - `/organizer` área administrativa do organizador
 * - `/user`      área de consulta do usuário
 *
 * Cada área tem a própria pilha, com cabeçalhos e botões de voltar próprios.
 *
 * Inter é a fonte do `design.md`. O app espera as quatro families carregarem antes
 * de montar a primeira tela, para que nenhum texto apareça com a fonte do sistema
 * e depois troque de corpo.
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={headerTheme}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="organizer" options={{ headerShown: false }} />
        <Stack.Screen name="user" options={{ headerShown: false }} />
        <Stack.Screen
          name="diagnostics"
          options={{ title: 'Diagnóstico', presentation: 'modal' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
