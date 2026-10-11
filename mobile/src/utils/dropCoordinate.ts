import type { Coordinate } from '@/types/coordinates';
import { isValidCoordinate } from '@/utils/geo';

/** Ponto em pixels, no mesmo sistema do `measureInWindow` do React Native. */
export type ScreenPoint = { x: number; y: number };

/**
 * O que o mapa precisa saber para converter um ponto de tela em coordenada.
 *
 * - `origin`: onde o mapa está na janela, por `measureInWindow` no contêiner do
 *   `EventMap`. O gesto entrega `absoluteX`/`absoluteY`, que já são da janela, e
 *   é por isso que a origem é necessária: sem ela, soltar no canto inferior
 *   direito da tela seria lido como um ponto muito além do mapa.
 * - `size`: o tamanho desenhado do mapa, por `onLayout`. É o retângulo que
 *   enquadra a região, então é ele que converte pixel em fração.
 * - `region`: a região visível mais recente, por `onRegionChangeComplete`.
 */
export type DropFrame = {
  origin: ScreenPoint;
  size: { width: number; height: number };
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
};

/**
 * Converte o ponto onde o dedo soltou o ícone em coordenada gravada.
 *
 * **Por que a conta é feita aqui e não pela biblioteca.** O `react-native-maps`
 * 1.27.2 — a versão fixada pelo PRD §24 — só expõe `pointForCoordinate`, que vai
 * de coordenada para pixel. O inverso, `coordinateFromPoint`, não existe nem nos
 * tipos nem no código nativo do iOS e do Android nessa versão (verificado em
 * `node_modules/react-native-maps`, `dist/src/MapView.d.ts`, `ios/` e `android/`).
 * Sem ele, a única porta do toque para a coordenada é o `onPress` do `MapView`, e
 * o `onPress` não dispara quando o dedo chega arrastando um ícone: o gesto não é
 * um toque, é um arrasto que termina fora do alvo. Então o ponto de queda é
 * convertido pela fração que ele ocupa no retângulo do mapa.
 *
 * A conta é a projeção do próprio `Region`: os dois `delta`s descrevem o que
 * está visível, então dividir o retângulo em frações e aplicar cada fração ao seu
 * `delta` é a leitura correta do enquadramento — não é aproximação de Mercator,
 * é a mesma conta que a biblioteca faria para desenhar o conteúdo daquele
 * retângulo.
 *
 * **A precisão.** O ponto cai onde o dedo soltou, dentro da resolução do gesto.
 * Para um pavilhão, onde o enquadramento tem algumas centenas de metros, a
 * diferença entre a fração do pixel e a projeção real é de poucos metros. Por
 * isso o toque no mapa continua existindo: soltar dá o ponto rápido e tocar
 * ajusta no milímetro, e os dois alimentam a mesma posição. Arrastar não pode
 * ser o único jeito de posicionar um ponto — isso quebraria quem usa leitor de
 * tela, que não arrasta (RNF04).
 *
 * Devolve `null` quando não dá para converter: antes do mapa medir, com tamanho
 * zero, com a região degenerada, ou quando a conta sai da faixa do globo. O
 * chamador trata `null` como "ainda não dá para soltar" em vez de gravar um
 * ponto no Golfo da Guiné — que é o modo de falha que a Sprint 7 já encontrou
 * quando o campo de `lat`/`lng` virava `0,0` em silêncio.
 */
export function coordinateAtDrop(drop: ScreenPoint, frame: DropFrame | null): Coordinate | null {
  if (!frame) return null;

  const { origin, size, region } = frame;

  if (size.width <= 0 || size.height <= 0) return null;
  if (region.latitudeDelta <= 0 || region.longitudeDelta <= 0) return null;

  const xFraction = clamp((drop.x - origin.x) / size.width, 0, 1);
  const yFraction = clamp((drop.y - origin.y) / size.height, 0, 1);

  // `y` cresce para baixo na tela e a latitude cresce para o norte, então a
  // fração vertical é subtraída do meio em vez de somada.
  const coordinate: Coordinate = [
    region.latitude + region.latitudeDelta * (0.5 - yFraction),
    region.longitude + region.longitudeDelta * (xFraction - 0.5),
  ];

  return isValidCoordinate(coordinate) ? coordinate : null;
}

/** O ponto de queda caiu dentro do retângulo do mapa? */
export function isInsideMap(drop: ScreenPoint, frame: DropFrame | null): boolean {
  if (!frame) return false;

  const localX = drop.x - frame.origin.x;
  const localY = drop.y - frame.origin.y;

  return localX >= 0 && localY >= 0 && localX <= frame.size.width && localY <= frame.size.height;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * O zoom resolve o enquadramento, e o tamanho do mapa não é mais ajustável.
 *
 * A altura do mapa já foi redimensionável por uma alça, porque escolher o ponto
 * parece pedir um desenho maior. Isso deixou de ser verdade quando o ponto deixou
 * de ser uma coordenada solta e passou a ser uma **marcação com tamanho**: a
 * pessoa ajusta o quanto a caixa ocupa arrastando as alças de canto, e o zoom do
 * próprio mapa faz o resto. Redimensionar a janela do mapa só mudava o
 * enquadramento inicial — e o enquadramento é o mesmo controle, com dois
 * lugares para fazer a mesma coisa.
 *
 * Por isso este arquivo tem só a conversão de ponto para coordenada, e nenhuma
 * constante de altura: o piso e o teto do `MAP_MIN_HEIGHT`/`MAP_MAX_HEIGHT`
 * desapareceram junto com a alça.
 */
