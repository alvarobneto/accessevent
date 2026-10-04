import type { Path } from '@/data/types';
import type { MapGeometry, MapPolyline } from '@/types/map';
import { isValidCoordinate } from '@/utils/geo';

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
