import type { Coordinate } from '@/types/coordinates';

/**
 * O retângulo que marca o ponto de interesse, em dois cantos opostos.
 *
 * É a mesma forma que o backend guarda e devolve (`backend/src/pois/poi-anchor.ts`):
 * o app não tem um formato próprio de geometria, ele fala o idioma do banco.
 */
export type PoiRect = {
  northEast: Coordinate;
  southWest: Coordinate;
};

/**
 * Onde o ícone está dentro do retângulo, em fração: `u` de oeste (0) a leste (1),
 * `v` de sul (0) a norte (1).
 *
 * O ícone é a **âncora**, não o ponto. Redimensionar o retângulo move o ícone
 * junto, porque a mesma fração continua descrevendo o mesmo lugar dentro do quadro
 * novo — é isso que o `position` derivado da API faz.
 */
export type PoiAnchor = {
  u: number;
  v: number;
};

/** Âncora do meio: onde o ícone nasce quando o retângulo ainda não foi mexido. */
export const CENTER_ANCHOR: PoiAnchor = { u: 0.5, v: 0.5 };

/**
 * Lado do retângulo que um ponto ganha quando ele ainda não foi desenhado, em
 * graus.
 *
 * `0,00004` são ~4,4 m de norte a sul e ~4,1 m de oeste a leste: o tamanho de uma
 * porta de banheiro ou de
 * um elevador, que é o que o organizador está marcando. Não é a área do ponto —
 * isso é dado da Sprint 10 — e sim a caixa que diz "é aqui", grande o bastante
 * para as alças dos cantos não nascerem uma em cima da outra.
 *
 * O piso é metade disso, e existe porque um quadro sem área não tem canto, e
 * alça sem canto é um alvo de toque que não move nada.
 */
export const DEFAULT_POI_RECT_SPAN = 0.00004;
export const MIN_POI_RECT_SPAN = 0.00002;

/** Cantos do retângulo, para a alça de arraste saber o que mover. */
export type PoiRectCorner = 'northWest' | 'northEast' | 'southEast' | 'southWest';

/**
 * Aplica a âncora no retângulo e devolve o ponto do ícone.
 *
 * A API já devolve `position` calculado, então isto é para o **formulário**, que
 * precisa do ponto absoluto entre um arraste e outro: enquanto a pessoa arrasta o
 * ícone é preciso mostrar o pino no lugar certo, e o pino é um `Marker`, que
 * consome lat/lng e não fração.
 */
export function anchorToPosition(rect: PoiRect, anchor: PoiAnchor): Coordinate {
  const [north, east] = rect.northEast;
  const [south, west] = rect.southWest;

  return [south + (north - south) * anchor.v, west + (east - west) * anchor.u];
}

/**
 * Coloca os cantos na ordem canônica, com o maior no `northEast`.
 *
 * Quem desenha arrastando solta o dedo em qualquer ordem, e um `northEast` abaixo
 * do `southWest` desenharia um polígono de área negativa. O backend também
 * normaliza — isto é para o desenho do formulário, que mostra o retângulo no
 * mesmo frame em que o dedo solta.
 */
export function normalizeRect(rect: PoiRect): PoiRect {
  const [northLat, eastLng] = rect.northEast;
  const [southLat, westLng] = rect.southWest;

  return {
    northEast: [Math.max(northLat, southLat), Math.max(eastLng, westLng)],
    southWest: [Math.min(northLat, southLat), Math.min(eastLng, westLng)],
  };
}

/** Os quatro cantos do retângulo, na ordem em que o `Polygon` do mapa espera. */
export function rectCorners(rect: PoiRect): Coordinate[] {
  const [north, east] = rect.northEast;
  const [south, west] = rect.southWest;

  return [
    [north, west],
    [north, east],
    [south, east],
    [south, west],
  ];
}

/**
 * O retângulo de um ponto que acabou de ser solto no mapa: uma caixa em torno do
 * lugar tocado, com o ícone no meio.
 *
 * É o mesmo modelo da migração — que transforma a posição antiga de um ponto em
 * uma caixa de poucos metros com a âncora central — então um ponto criado agora e
 * um ponto que já existia têm a mesma cara no mapa.
 *
 * **A caixa é quadrada em graus, não em metros.** Somar o mesmo `span` na latitude
 * e na longitude é o que dá a simetria mais simples de descrever, e em São Paulo
 * isso deixa o lado leste-oeste ~8% menor que o norte-sul (`1/cos(lat)`), o que
 * num quadro de 4 m é meio metro. Converter para metros exigiria a fórmula de
 * latitude, que é a mesma conta que `distanceInMeters` faz e que o retângulo não
 * precisa: ninguém mede a marcação, e a âncora central é o meio nos dois casos.
 */
export function rectFromCenter(center: Coordinate, span = DEFAULT_POI_RECT_SPAN): PoiRect {
  const [latitude, longitude] = center;
  const half = span / 2;

  return {
    northEast: [latitude + half, longitude + half],
    southWest: [latitude - half, longitude - half],
  };
}

/**
 * Move um canto do retângulo para a coordenada arrastada.
 *
 * Só o canto arrastado muda; os outros três ficam onde estavam, então é isto que
 * faz o quadro crescer para um lado e encolher para o outro, que é o que quem
 * redimensiona espera. O lado nunca fica menor que `MIN_POI_RECT_SPAN`: um quadro
 * achatado até zero não tem canto, e a alça pararia de responder exatamente
 * quando a pessoa ainda está arrastando.
 *
 * **A conta é feita em bordas, não em cantos.** Um `PoiRect` guarda só dois
 * cantos, e eles são diagonalmente opostos — logo o leste mora em
 * `northEast[1]` e o oeste em `southWest[1]`, e a mesma aresta aparece nos dois
 * cantos. Escrever o canto arrastado no seu lugar deixa a aresta inconsistente:
 * arrastar o sudeste para leste mexeria no oeste e deixaria o leste no lugar, e o
 * polígono sairia virado (`northEast` abaixo de `southWest`).
 *
 * Por isso: extrai as quatro bordas, aplica no par latitude/longitude que o canto
 * arrastado toca, e remonta os dois cantos. É a mesma ordem de
 * `normalizeRect` — maior no `northEast` — e a correção fica garantida por
 * construção, não por uma checagem no fim.
 */
export function resizeRect(rect: PoiRect, corner: PoiRectCorner, position: Coordinate): PoiRect {
  const north = rect.northEast[0];
  const east = rect.northEast[1];
  const south = rect.southWest[0];
  const west = rect.southWest[1];

  // `Coordinate` é um array de leitura, então o retângulo novo é montado por
  // inteiro em vez de escrito campo a campo — mutar `northEast[0]` não compila
  // justamente para impedir que um canto se mexa no meio da conta.
  const northLimit = south + MIN_POI_RECT_SPAN;
  const southLimit = north - MIN_POI_RECT_SPAN;
  const eastLimit = west + MIN_POI_RECT_SPAN;
  const westLimit = east - MIN_POI_RECT_SPAN;

  const touchesNorth = corner === 'northWest' || corner === 'northEast';
  const touchesSouth = corner === 'southWest' || corner === 'southEast';
  const touchesEast = corner === 'northEast' || corner === 'southEast';
  const touchesWest = corner === 'northWest' || corner === 'southWest';

  return normalizeRect({
    northEast: [
      touchesNorth ? Math.max(position[0], northLimit) : north,
      touchesEast ? Math.max(position[1], eastLimit) : east,
    ],
    southWest: [
      touchesSouth ? Math.min(position[0], southLimit) : south,
      touchesWest ? Math.min(position[1], westLimit) : west,
    ],
  });
}

/**
 * Passo de redimensionamento sem arraste, em graus.
 *
 * Um passo por `MIN_POI_RECT_SPAN` (≈2 m) seria fisicamente exato e praticamente
 * invisível: quem aperta "aumentar" duas vezes não veria diferença. O passo é o
 * próprio `DEFAULT_POI_RECT_SPAN` (≈4,4 m), que é o quanto o quadro nasce — uma
 * ação de leitor de tela muda a marcação por uma porta visível.
 */
export const ACCESSIBILITY_RESIZE_STEP = DEFAULT_POI_RECT_SPAN;

/** Para onde o canto anda quando a marcação cresce ou encolhe. */
export type PoiResizeDirection = 'grow' | 'shrink';

/**
 * Redimensiona o quadro em um passo, sem coordenada e sem pixel.
 *
 * É a porta do leitor de tela: `accessibilityRole="adjustable"` entrega `increment`
 * e `decrement`, e quem ouve não tem `pageX`/`pageY` para arrastar. O passo sai
 * do canto arrastado para longe do oposto (`grow`) ou para perto dele
 * (`shrink`), e a conta e o piso são os de `resizeRect` — esta função só escolhe
 * a coordenada e delega, para os dois caminhos compartilharem a mesma clampagem.
 */
export function resizeRectByStep(
  rect: PoiRect,
  corner: PoiRectCorner,
  direction: PoiResizeDirection,
): PoiRect {
  const current = cornerPosition(corner, rect);
  const grow = GROW_OFFSET[corner];
  const sign = direction === 'grow' ? 1 : -1;

  return resizeRect(rect, corner, [
    current[0] + sign * grow[0],
    current[1] + sign * grow[1],
  ]);
}

/**
 * Para onde cada canto anda quando o quadro **cresce**.
 *
 * Crescer é sair do centro, e o centro é o canto oposto: o noroeste cresce para o
 * norte e para o oeste, o sudeste para o sul e para o leste. `shrink` é o mesmo
 * par com o sinal trocado, então a direção não precisa de um segundo mapa — só de
 * inverter o sinal.
 *
 * A chave é o nome do canto porque é o nome que o chamador tem: quem chega aqui
 * com `'northEast'` não deveria precisar saber o índice do canto oposto para
 * descobrir para onde ele anda.
 */
const GROW_OFFSET: Record<PoiRectCorner, Coordinate> = {
  northWest: [ACCESSIBILITY_RESIZE_STEP, -ACCESSIBILITY_RESIZE_STEP],
  northEast: [ACCESSIBILITY_RESIZE_STEP, ACCESSIBILITY_RESIZE_STEP],
  southEast: [-ACCESSIBILITY_RESIZE_STEP, ACCESSIBILITY_RESIZE_STEP],
  southWest: [-ACCESSIBILITY_RESIZE_STEP, -ACCESSIBILITY_RESIZE_STEP],
};

/**
 * A coordenada de um canto do retângulo.
 *
 * Só a aresta norte–leste e a sul–oeste estão guardadas, então o canto pedido é
 * montado a partir delas: `northWest` é o norte com o oeste, `southEast` é o sul
 * com o leste. Sem isto, o chamador do passo de leitor de tela teria de repetir a
 * mesma combin four vezes.
 */
function cornerPosition(corner: PoiRectCorner, rect: PoiRect): Coordinate {
  const north = rect.northEast[0];
  const east = rect.northEast[1];
  const south = rect.southWest[0];
  const west = rect.southWest[1];

  switch (corner) {
    case 'northWest':
      return [north, west];
    case 'northEast':
      return [north, east];
    case 'southEast':
      return [south, east];
    case 'southWest':
      return [south, west];
  }
}

/**
 * Descobre a âncora de um ponto dentro do retângulo — o inverso de
 * `anchorToPosition`.
 *
 * A fração sai limitada a 0..1: o ícone é o rótulo do retângulo, então sair do
 * quadro é um estado que não existe, e um retângulo sem área cai no meio em vez
 * de dividir por zero.
 */
export function positionToAnchor(rect: PoiRect, position: Coordinate): PoiAnchor {
  const [north, east] = rect.northEast;
  const [south, west] = rect.southWest;

  const latitudeSpan = north - south;
  const longitudeSpan = east - west;

  if (latitudeSpan === 0 || longitudeSpan === 0) return CENTER_ANCHOR;

  return {
    u: clamp01((position[1] - west) / longitudeSpan),
    v: clamp01((position[0] - south) / latitudeSpan),
  };
}

/** O retângulo e a âncora que resultam de arrastar o ícone para `position`. */
export type PoiDragResult = {
  rect: PoiRect;
  anchor: PoiAnchor;
};

/**
 * Arrastar o ícone é levar o ponto inteiro para o lugar do dedo.
 *
 * Arrastar o pino para longe da caixa não pode deixar o ícone para fora do
 * retângulo — ele é o rótulo da caixa, e um rótulo fora do quadro não é um
 * estado que a interface consiga explicar. Então a âncora é lida do ponto de
 * queda com `positionToAnchor` (limitada ao quadro) e a caixa é transladada para
 * que o ícone caia exatamente onde o dedo soltou.
 *
 * Devolve os dois porque é isso que o formulário grava: retângulo e âncora, com
 * `position` recalculado pela API a partir deles.
 */
export function dragIconTo(rect: PoiRect, position: Coordinate): PoiDragResult {
  const anchor = positionToAnchor(rect, position);
  const current = anchorToPosition(rect, anchor);

  const delta: Coordinate = [position[0] - current[0], position[1] - current[1]];

  return {
    anchor,
    rect: {
      northEast: [rect.northEast[0] + delta[0], rect.northEast[1] + delta[1]],
      southWest: [rect.southWest[0] + delta[0], rect.southWest[1] + delta[1]],
    },
  };
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
