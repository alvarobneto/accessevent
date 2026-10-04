import type { CoordinateTuple } from '../../common/is-coordinate.js';

import { IsPathGeometry } from './is-path-geometry.js';

export {
  MAXIMUM_PATH_POINTS,
  MINIMUM_PATH_POINTS,
} from './is-path-geometry.js';

/**
 * Corpo do `POST /maps/:mapId/paths`.
 *
 * Só a geometria. A distância é calculada pelo servidor a partir dela: aceitar o
 * número do app criaria dois lugares que discordam — e o cálculo de rota da
 * Sprint 16 usaria a coluna, enquanto a tela de gravação mostraria a outra — sem
 * nenhum sinal de qual está certa.
 */
export class CreatePathDto {
  @IsPathGeometry()
  geometry!: CoordinateTuple[];
}
