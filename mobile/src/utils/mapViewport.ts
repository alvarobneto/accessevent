import type { Coordinate } from '@/types/coordinates';
import { DEFAULT_MAP_DELTA, isValidCoordinate, MINIMUM_DELTA, ZOOM_FACTOR } from '@/utils/geo';
import type { ScreenPoint } from '@/utils/dropCoordinate';

export { ZOOM_FACTOR };

/**
 * O enquadramento do `MapCanvas` do editor de áreas.
 *
 * Este protótipo desenha áreas e pontos num SVG próprio em vez do
 * `react-native-maps` — a justificativa completa está em `AGENTS.md`, seção
 * **Editor de áreas (Sprint 8)**. O conteúdo do desenho é geográfico (WGS84,
 * como o resto do app), então a tela guarda um `MapViewport` e projeta para
 * pixel a cada frame com as funções deste arquivo, e **nunca** guarda geometria
 * em pixel: ao dar zoom ou arrastar, a área precisa sair do mesmo lugar (ver
 * `MapRect` em `types/map.ts`, que documenta o mesmo caso para o `event-map`).
 */
export type MapViewport = {
  center: Coordinate;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** Tamanho desenhado do canvas, em pixels (`onLayout`). */
export type ViewportSize = {
  width: number;
  height: number;
};

/**
 * A caixa de um polígono: norte/sul e leste/oeste, em graus.
 *
 * É o mesmo conceito de `regionForGeometry`, só que em campos nomeados para o
 * editor usar sem passar pelo `Region` do `react-native-maps`.
 */
export type CoordinateBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

/**
 * Limites do zoom do editor.
 *
 * O piso de 0,0002° é ~22 m de latitude: menos que isso o desenho de um cômodo
 * inteiro ocupa a tela toda e a alça de um canto some de vista. O teto de 0,05°
 * (~5,5 km) existe para o botão de menos não virar o mapa num hemisfério inteiro
 * por descuido — o editor descreve um pavilhão, e não uma cidade.
 */
export const MIN_LATITUDE_DELTA = MINIMUM_DELTA;
export const MAX_LATITUDE_DELTA = 0.05;

/**
 * Zoom inicial padrão: do máximo, dois toques em reduzir.
 * `0,0002° × 1,6² = 0,000512°` (aprox. 57 m de norte a sul).
 */
export const INITIAL_LATITUDE_DELTA = DEFAULT_MAP_DELTA;

/** Centro inicial: o Memorial da América Latina, em São Paulo. */
export const INITIAL_CENTER: Coordinate = [-23.5505, -46.6333];

/** Distância alvo entre as linhas da grade de fundo, em pixels. */
export const GRID_STEP_TARGET_PX = 48;

/**
 * Devia o enquadramento para a forma canônica.
 *
 * `longitudeDelta` **não é livre**: é `latitudeDelta * largura/altura`, a mesma
 * conta do `Region` do `react-native-maps`. Sem isso o desenho de um quadrado
 * sairia achatado — um grau de longitude é mais estreito que um de latitude, e
 * a projeção deixa a relação entre os dois como a relação entre os lados do
 * canvas. Toda função que devolve um viewport passa por aqui, então um centro ou
 * um delta inválido não sobrevive a nenhuma ação.
 */
export function normalizeViewport(viewport: MapViewport, size: ViewportSize): MapViewport {
  const latitudeDelta = clamp(viewport.latitudeDelta, MIN_LATITUDE_DELTA, MAX_LATITUDE_DELTA);
  const aspect = size.height > 0 ? size.width / size.height : 1;

  return {
    center: viewport.center,
    latitudeDelta,
    longitudeDelta: latitudeDelta * aspect,
  };
}

/**
 * Redimensiona o canvas sem alterar o nível de zoom percebido.
 *
 * O conteúdo pode ganhar/perder altura quando o estado dos controles muda. A
 * escala em graus por pixel fica fixa; um canvas maior passa a mostrar mais mapa,
 * mas os elementos não mudam de tamanho sob o dedo.
 */
export function resizeViewport(
  viewport: MapViewport,
  previousSize: ViewportSize,
  nextSize: ViewportSize,
): MapViewport {
  if (previousSize.height <= 0 || previousSize.width <= 0) {
    return normalizeViewport(viewport, nextSize);
  }

  const latitudePerPixel = viewport.latitudeDelta / previousSize.height;
  return normalizeViewport(
    {
      ...viewport,
      latitudeDelta: latitudePerPixel * nextSize.height,
    },
    nextSize,
  );
}

/**
 * Projeta uma coordenada geográfica em pixel no canvas.
 *
 * A conta é a projeção linear do `Region` (ver `dropCoordinate.ts`): assume que
 * o retângulo visível é descrito pelos dois `delta`s, então a fração da
 * coordenada dentro do enquadramento é a mesma fração do pixel dentro do canvas.
 * É **a mesma aproximação** do mapa da Sprint 7, e em escala de pavilhão a
 * diferença para a projeção real é de poucos metros.
 */
export function mapToScreen(
  coordinate: Coordinate,
  viewport: MapViewport,
  size: ViewportSize,
): ScreenPoint {
  const [latitude, longitude] = coordinate;
  const [centerLatitude, centerLongitude] = viewport.center;

  return {
    // `x` cresce para o leste (a longitude cresce para lá) e `y` cresce para
    // baixo enquanto a latitude cresce para o norte, então o sinal do `y`
    // é invertido — a mesma regra do `coordinateAtDrop`.
    x: size.width / 2 + ((longitude - centerLongitude) / viewport.longitudeDelta) * size.width,
    y: size.height / 2 - ((latitude - centerLatitude) / viewport.latitudeDelta) * size.height,
  };
}

/**
 * Converte o pixel do canvas em coordenada gravada — o inverso de `mapToScreen`.
 *
 * O ponto é **local do canvas** (0..largura, 0..altura), e não da janela: o
 * `MapCanvas` mede o próprio contêiner e trabalha com o dedo relativo a ele. O
 * arredondamento fica limitado ao retângulo do canvas, e devolve `null` quando a
 * conta sai da faixa do globo — o mesmo guarda-roupa do `coordinateAtDrop`, para
 * nenhuma ação gravar um ponto impossível.
 */
export function screenToMap(
  point: ScreenPoint,
  viewport: MapViewport,
  size: ViewportSize,
): Coordinate | null {
  if (size.width <= 0 || size.height <= 0) return null;
  if (viewport.latitudeDelta <= 0 || viewport.longitudeDelta <= 0) return null;

  const xFraction = clamp(point.x / size.width, 0, 1);
  const yFraction = clamp(point.y / size.height, 0, 1);
  const [centerLatitude, centerLongitude] = viewport.center;

  const coordinate: Coordinate = [
    centerLatitude + viewport.latitudeDelta * (0.5 - yFraction),
    centerLongitude + viewport.longitudeDelta * (xFraction - 0.5),
  ];

  return isValidCoordinate(coordinate) ? coordinate : null;
}

/**
 * Arrasta o enquadramento pelo gesto de um dedo, em pixel.
 *
 * Mover o dedo para a direita traz o conteúdo para a direita — que é ver o
 * mundo para o **oeste** — então o centro anda para a longitude menor. O mesmo
 * raciocínio vale verticalmente: dedo para baixo, centro para o norte.
 */
export function panViewport(
  viewport: MapViewport,
  dxPx: number,
  dyPx: number,
  size: ViewportSize,
): MapViewport {
  const latPerPixel = viewport.latitudeDelta / size.height;
  const lngPerPixel = viewport.longitudeDelta / size.width;
  const [latitude, longitude] = viewport.center;

  return normalizeViewport(
    {
      center: [latitude + dyPx * latPerPixel, longitude - dxPx * lngPerPixel],
      latitudeDelta: viewport.latitudeDelta,
      longitudeDelta: viewport.longitudeDelta,
    },
    size,
  );
}

/**
 * Dá zoom mantendo o pixel `anchorPx` parado na tela.
 *
 * É o gesto natural do botão de aumentar: a coisa sob o dedo (ou no centro do
 * canvas, que é o ponto que o botão passa) continua onde está e o resto cresce.
 * Sem o âncora fixo, o centro mudaria junto com o zoom e o mapa parecia escapar.
 */
export function zoomViewportAt(
  viewport: MapViewport,
  anchorPx: ScreenPoint,
  factor: number,
  size: ViewportSize,
): MapViewport {
  const latitudeDelta = clamp(
    viewport.latitudeDelta * factor,
    MIN_LATITUDE_DELTA,
    MAX_LATITUDE_DELTA,
  );
  const [centerLatitude, centerLongitude] = viewport.center;

  const verticalFraction = 0.5 - anchorPx.y / size.height;
  const horizontalFraction = anchorPx.x / size.width - 0.5;

  const anchorLatitude = centerLatitude + verticalFraction * viewport.latitudeDelta;
  const anchorLongitude = centerLongitude + horizontalFraction * viewport.longitudeDelta;

  const next = normalizeViewport(
    {
      center: [
        anchorLatitude - verticalFraction * latitudeDelta,
        anchorLongitude -
          horizontalFraction * latitudeDelta * (size.height > 0 ? size.width / size.height : 1),
      ],
      latitudeDelta,
      longitudeDelta: viewport.longitudeDelta,
    },
    size,
  );

  return next;
}

/**
 * Enquadra uma caixa de coordenadas, com folga nas bordas.
 *
 * É o `regionForGeometry` do editor: devolve `null` quando não há caixa (área
 * sem ponto válido) e usa o piso do zoom para uma área pequena não ocupar o
 * canvas inteiro. O piso do reenquadramento é o zoom inicial global
 * (`INITIAL_LATITUDE_DELTA`): máximo menos dois passos de zoom out. A folga padrão
 * de 0,0002° (~22 m) continua protegendo o desenho junto à borda.
 */
export function viewportForBounds(
  bounds: CoordinateBounds | null,
  size: ViewportSize,
  padding = 0.0002,
): MapViewport | null {
  if (!bounds) return null;

  return normalizeViewport(
    {
      center: [(bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2],
      latitudeDelta: Math.max(bounds.north - bounds.south + 2 * padding, INITIAL_LATITUDE_DELTA),
      longitudeDelta: 0,
    },
    size,
  );
}

/** `point` está dentro da caixa? Uma área que estende a fronteira inclui o ponto. */
export function pointInBounds(point: Coordinate, bounds: CoordinateBounds): boolean {
  const [latitude, longitude] = point;

  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

/**
 * Passo da grade de fundo, em graus.
 *
 * A grade é o que torna o arraste do canvas visível: sem ela um pavilhão em
 * branco parece o mesmo mapa em qualquer zoom. O passo é escolhido de uma escala
 * "bonita" (`0,0001°`, `0,0002°`, `0,0005°`…) para os `~48px` alvo — nunca um
 * número quebrado, senão a grade dança de tamanho a cada troca de zoom.
 *
 * Como `longitudeDelta = latitudeDelta * largura/altura`, o mesmo passo cobre
 * `GRID_STEP_TARGET_PX` nos dois eixos.
 */
export function gridStepFor(
  latitudeDelta: number,
  size: ViewportSize,
  targetPx = GRID_STEP_TARGET_PX,
): number {
  const desired = (latitudeDelta * Math.max(targetPx, 1)) / Math.max(size.height, 1);

  for (const step of GRID_STEPS) {
    if (step >= desired) return step;
  }

  return GRID_STEPS[GRID_STEPS.length - 1] ?? 0.05;
}

/** As latitudes das linhas horizontais da grade, dentro do enquadramento. */
export function gridLatitudes(viewport: MapViewport, size: ViewportSize): number[] {
  return gridPositions(
    viewport.center[0],
    viewport.latitudeDelta,
    gridStepFor(viewport.latitudeDelta, size),
  );
}

/** As longitudes das linhas verticais da grade, dentro do enquadramento. */
export function gridLongitudes(viewport: MapViewport, size: ViewportSize): number[] {
  return gridPositions(
    viewport.center[1],
    viewport.longitudeDelta,
    gridStepFor(viewport.latitudeDelta, size),
  );
}

function gridPositions(center: number, delta: number, step: number): number[] {
  const low = center - delta / 2;
  const high = center + delta / 2;
  const positions: number[] = [];

  for (let position = Math.ceil(low / step) * step; position <= high; position += step) {
    positions.push(position);
  }

  return positions;
}

const GRID_STEPS = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
