import type { Path, PointOfInterest } from '@/data/types';
import type { MapGeometry, MapPolyline, MapMarker, MapRect } from '@/types/map';
import { isValidCoordinate } from '@/utils/geo';
import type { PoiRect } from '@/utils/poiAnchor';
import { poiIcon } from '@/utils/poiIcons';

/** Um caminho com menos de dois pontos válidos não tem trecho para desenhar. */
const MINIMUM_DRAWABLE_POINTS = 2;

/**
 * Caminhos gravados viram polilinhas do mapa.
 *
 * A conversão é uma função pura e mora em `utils/` porque é o mesmo tipo de
 * decisão que o `EventMap` toma: um trajeto degenerado não vira linha, e o
 * `EventMap` não deve ser o único a saber disso. O filtro usa
 * `isValidCoordinate` — o mesmo que o componente usa no desenho — porque
 * coordenada fora da faixa do globo tem de ser ignorada nos dois lugares, e não
 * só quando chega no mapa.
 *
 * O `tone` fica no padrão: a cor de um caminho só muda quando existe um contexto
 * (a rota em destaque da Sprint 18, o contexto da Sprint 17), e pintar o caminho
 * de "verde" para dizer que ele serve seria vender acessibilidade que ninguém
 * verificou (PRD §19).
 */
export function polylinesFromPaths(paths: readonly Path[]): MapPolyline[] {
  return paths
    .filter((path) => drawablePointCount(path.geometry) >= MINIMUM_DRAWABLE_POINTS)
    .map((path) => ({ id: path.id, geometry: path.geometry }));
}

/** Quantos pontos do trajeto podem de fato ser desenhados. */
function drawablePointCount(geometry: MapGeometry): number {
  return geometry.filter(isValidCoordinate).length;
}

/**
 * Pontos de interesse viram marcadores do mapa.
 *
 * Fica ao lado de `polylinesFromPaths` pelo mesmo motivo: coordenada fora da
 * faixa do globo é ignorada antes de virar desenho, e o filtro é o mesmo
 * `isValidCoordinate` que o `EventMap` usa no desenho — assim o ponto que não
 * pode ser mostrado também não entra no enquadramento da câmera.
 *
 * **Cada ponto leva o ícone do seu tipo.** `poiIcon` decide pelo `type`, então o
 * marcador e a paleta de criação mostram o mesmo desenho para o mesmo tipo — é o
 * que faz o mapa ser lido sem passar pela lista. Antes o pino era genérico e a
 * distinção só aparecia no texto do balão, que ninguém abre para dizer "isto é o
 * banheiro".
 *
 * O `tone` fica no padrão. A cor de um ponto só muda quando existe um contexto —
 * o ponto em edição da Sprint 7 é o que a tela decide, passando o tom por cima —
 * e pintar o ponto de "verde" para dizer que ele serve seria vender
 * acessibilidade que ninguém verificou (PRD §19).
 */
export function markersFromPois(pois: readonly PointOfInterest[]): MapMarker[] {
  return pois
    .filter((poi) => isValidCoordinate(poi.position))
    .map((poi) => ({
      id: poi.id,
      coordinate: poi.position,
      label: poi.name,
      description: poi.type,
      icon: poiIcon(poi.type),
    }));
}

/**
 * Pontos de interesse viram também as marcações do mapa.
 *
 * A marcação é o que o organizador desenhou — a caixa que diz "é aqui" — e ela
 * viaja com o ponto: quem abre o mapa depois de mapear o banheiro vê o banheiro
 * e a área que ele ocupava. Só o ícone sem a caixa mostraria o resultado sem
 * mostrar o que foi mapeado.
 *
 * O filtro é o mesmo de `markersFromPois`, e pelo mesmo motivo: um retângulo com
 * canto inválido desenharia um polígono esticado para o outro lado do mundo, e
 * o ponto que não pode ser mostrado também não pode ter a caixa desenhada.
 *
 * Sem `editable` e sem `onResize`: estes são os pontos **já salvos**, e a edição
 * acontece numa tela só, com um ponto só. A alça aparece quando `editable` é
 * `true`, que só o rascunho do formulário marca.
 */
export function rectsFromPois(pois: readonly PointOfInterest[]): MapRect[] {
  return pois
    .filter((poi) => isValidRect(poi.rect))
    .map((poi) => ({ id: poi.id, rect: poi.rect }));
}

/** Os quatro cantos do retângulo são desenháveis? */
function isValidRect(rect: PoiRect): boolean {
  return (
    isValidCoordinate(rect.northEast) &&
    isValidCoordinate(rect.southWest) &&
    rect.northEast[0] >= rect.southWest[0] &&
    rect.northEast[1] >= rect.southWest[1]
  );
}
