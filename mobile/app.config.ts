import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Valor que ocupa a chave enquanto o Google Cloud não emite uma de verdade.
 *
 * O mesmo literal mora em `src/config/env.ts`, que é quem decide se o `EventMap`
 * monta o `MapView`. Os dois lados precisam concordar, e por isso o placeholder
 * nunca é injetado no manifesto: uma chave que chega ao `AndroidManifest.xml`
 * faz o Google Maps aceitar a chave, montar o mapa e desenhá-lo em branco, sem
 * nenhuma pista do que falta. Sem chave nenhuma o app nem chega a montar.
 *
 * Repetido em vez de importado porque este arquivo roda no Node, no build
 * nativo, e não no bundle do Metro.
 */
const PLACEHOLDER_KEY = 'PLACEHOLDER';

/** A chave de verdade, ou `null` enquanto o `.env` ainda tem o placeholder. */
function androidGoogleMapsApiKey(): string | null {
  const configured = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim() ?? '';

  return configured === '' || configured === PLACEHOLDER_KEY ? null : configured;
}

/**
 * Troca as opções do plugin `react-native-maps` pela chave do Android.
 *
 * O registro em `app.json` (`["react-native-maps", {}]`) continua sendo a
 * declaração de que o app usa mapa; o plugin sem chave não altera o projeto
 * nativo, então deixá-lo como está não faz falta nenhuma chave. Aqui só entra a
 * opção que o `AndroidManifest.xml` precisa — e que, sozinha, evita o crash:
 * o Google Maps no Android exige `com.google.android.geo.API_KEY`, e o
 * `react-native-maps` mata o processo ao criar o `MapView` sem ela.
 */
function withAndroidMapsApiKey(
  plugins: ExpoConfig['plugins'],
  apiKey: string,
): ExpoConfig['plugins'] {
  return (plugins ?? []).map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'react-native-maps'
      ? ['react-native-maps', { androidGoogleMapsApiKey: apiKey }]
      : plugin,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiKey = androidGoogleMapsApiKey();

  // O `ConfigContext` entrega o `app.json` como `Partial<ExpoConfig>`, mas ele é
  // a fonte de verdade do projeto e declara `name` e `slug`: aqui só se troca a
  // chave do mapa, nada do resto do manifesto. A afirmação está no `config` que
  // entra, não no objeto que sai, que continua sendo conferido pelo `ExpoConfig`.
  const staticConfig = config as ExpoConfig;

  return {
    ...staticConfig,
    plugins: apiKey ? withAndroidMapsApiKey(staticConfig.plugins, apiKey) : staticConfig.plugins,
  };
};
