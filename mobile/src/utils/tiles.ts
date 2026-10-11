import { mapToScreen, type MapViewport, type ViewportSize } from '@/utils/mapViewport';

/**
 * O mapa de fundo do `MapCanvas`.
 *
 * O editor desenha num SVG próprio (a justificativa está em `AGENTS.md`), mas um
 * pavilhão tem endereço — os caminhos gravados carregam coordenada WGS84 — e o
 * desenho sobre o local de verdade precisa mostrar o local. O `MapCanvas` baixa
 * azulejos (tiles) do OpenStreetMap e os coloca atrás do desenho, pela mesma
 * projeção linear do viewport: cada tile é posicionado pelas coordenadas das
 * suas bordas, então a serigrafia alinha com as polilinhas dos caminhos no mesmo
 * ponto, sem costura entre tiles vizinhos.
 *
 * O nível de zoom dos tiles é escolhido para casar a escala horizontal do
 * `MapViewport` (`width/longitudeDelta`) com a escala do Web Mercator
 * (`256·2^z/360°`): no pavilhão isso significa no máximo um punhado de tiles
 * por quadro. A projeção vertical diverge da linear por `1/cos(latitude)` —
 * poucos metros na escala de um evento — e é a mesma aproximação documentada no
 * `mapViewport`.
 */
export type MapTile = {
  /** Nível de zoom do azulejo (a grade do Web Mercator). */
  zoom: number;
  /** Coluna e linha do azulejo. */
  x: number;
  y: number;
  /** A imagem do azulejo, para o `<Image>` do `react-native-svg`. */
  href: string;
  /** O retângulo do azulejo no canvas, em pixel, na projeção do viewport. */
  rect: { x: number; y: number; width: number; height: number };
};

/** Um azulejo Web Mercator tem 256px no lado, no mundo dos tiles. */
const TILE_SIZE_PX = 256;

/** A faixa de latitude visível no Web Mercator (±85,0511°). */
const MAX_MERCATOR_LATITUDE = 85.05112878;

const MIN_TILE_ZOOM = 1;

/** Cap de segurança: o viewport real do pavilhão nunca pede mais do que isso. */
const MAX_TILES = 25;

/** OSM exige cache de ao menos sete dias quando o cliente não lê os headers. */
export const TILE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Servidor público de tiles do OpenStreetMap. Trocar o provedor é trocar este prefixo. */
export const OSM_TILE_SERVER = 'https://tile.openstreetmap.org';

/**
 * Template de URL dos tiles no padrão Web Mercator.
 *
 * O canvas SVG monta a URL de cada tile a partir de `OSM_TILE_SERVER`; o mapa
 * nativo recebe este template e substitui `{z}/{x}/{y}` em runtime. É a mesma
 * fonte, para o editor e o mapa lido nunca apontarem para servidores diferentes.
 */
export const OSM_TILE_URL_TEMPLATE = `${OSM_TILE_SERVER}/{z}/{x}/{y}.png`;

/** Nível de zoom máximo pedido ao servidor; a grade do canvas e o mapa nativo o compartilham. */
export const OSM_TILE_MAX_ZOOM = 19;

/**
 * Os tiles que cobrem o enquadramento corrente.
 *
 * Devolve `[]` antes de o canvas ter tamanho. Colunas e linhas são calculadas
 * pelas bordas visíveis do viewport, encostadas na grade do Web Mercator e no
 * limite da latitude ±85° — um centro perto do polo não pode pedir tile
 * inexistente.
 */
export function tilesForViewport(viewport: MapViewport, size: ViewportSize): MapTile[] {
  if (size.width <= 0 || size.height <= 0) return [];

  const zoom = clamp(zoomForLongitudeDelta(viewport.longitudeDelta, size.width), MIN_TILE_ZOOM, OSM_TILE_MAX_ZOOM);
  const n = 2 ** zoom;

  const [centerLatitude, centerLongitude] = viewport.center;
  const westLng = centerLongitude - viewport.longitudeDelta / 2;
  const eastLng = centerLongitude + viewport.longitudeDelta / 2;
  const northLat = clamp(centerLatitude + viewport.latitudeDelta / 2, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
  const southLat = clamp(centerLatitude - viewport.latitudeDelta / 2, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);

  const x0 = clamp(Math.floor(((westLng + 180) / 360) * n), 0, n);
  const x1 = clamp(Math.ceil(((eastLng + 180) / 360) * n), 0, n);
  const y0 = clamp(Math.floor(latitudeToWorldY(northLat) * n), 0, n);
  const y1 = clamp(Math.ceil(latitudeToWorldY(southLat) * n), 0, n);

  if ((x1 - x0) * (y1 - y0) > MAX_TILES) return [];

  const tiles: MapTile[] = [];
  for (let x = x0; x < x1; x += 1) {
    for (let y = y0; y < y1; y += 1) {
      const tileWest = longitudeAtX(x, n);
      const tileEast = longitudeAtX(x + 1, n);
      const tileNorth = latitudeAtWorldY(y / n);
      const tileSouth = latitudeAtWorldY((y + 1) / n);

      const topLeft = mapToScreen([tileNorth, tileWest], viewport, size);
      const bottomRight = mapToScreen([tileSouth, tileEast], viewport, size);

      tiles.push({
        zoom,
        x,
        y,
        href: `${OSM_TILE_SERVER}/${zoom}/${x}/${y}.png`,
        rect: {
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
        },
      });
    }
  }

  return tiles;
}

/**
 * O nível de zoom cujo tile seguro uma escala horizontal igual à do canvas
 * (`px` por grau de longitude). `256·2^z` pixels cobrem 360°, então `2^z` é
 * `360·largura/(256·deltaLng)`.
 */
export function zoomForLongitudeDelta(longitudeDelta: number, widthPx: number): number {
  if (Math.abs(longitudeDelta) < 1e-12 || widthPx <= 0) return MIN_TILE_ZOOM;
  return Math.round(Math.log2((360 * widthPx) / (TILE_SIZE_PX * longitudeDelta)));
}

/** Decide se um tile local ainda está dentro do período mínimo de cache. */
export function isTileCacheFresh(lastModifiedMs: number | null, nowMs: number): boolean {
  return (
    lastModifiedMs !== null &&
    Number.isFinite(lastModifiedMs) &&
    lastModifiedMs <= nowMs &&
    nowMs - lastModifiedMs <= TILE_CACHE_TTL_MS
  );
}

/** Fração [0,1] da latitude no mundo do Web Mercator (0 no polo norte). */
function latitudeToWorldY(latitudeDeg: number): number {
  const latitude = (latitudeDeg * Math.PI) / 180;
  const sine = Math.sin(latitude);
  const cosine = Math.cos(latitude);
  // ln(tan + sec) = ln((1+sin)/cos), escolhido para não depender de `asinh`
  // (Hernes) e para nunca dividir por zero fora da faixa visível.
  return (1 - Math.log((1 + sine) / cosine) / Math.PI) / 2;
}

/** Latitude em graus da fração [0,1] do mundo do Web Mercator. */
function latitudeAtWorldY(worldY: number): number {
  const latitude = 2 * Math.atan(Math.exp(Math.PI * (1 - 2 * worldY))) - Math.PI / 2;
  return (latitude * 180) / Math.PI;
}

/** Longitude em graus da borda leste do tile `x`, na grade de `n` colunas. */
function longitudeAtX(x: number, n: number): number {
  return (x * 360) / n - 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
