import type { CoordinateTuple } from '../../common/is-coordinate.js';

import { IsPathGeometry } from './is-path-geometry.js';

/**
 * Corpo do `PATCH /paths/:pathId/geometry`.
 *
 * O contrato próprio que o `UpdatePathDto` prevê: o `PATCH /paths/:pathId`
 * continua aceitando só `name`, e aceitar geometria nele faria um renomear
 * reescrever o trajeto sem querer. Aqui o único campo é a geometria nova — o
 * organizador ajustou o trajeto no mapa e o servidor recalcula a distância a
 * partir dela, do mesmo jeito que na gravação.
 *
 * `distance` não entra no corpo pelos dois motivos de sempre: a API deriva o
 * valor, e mandar o número calculado no app criaria dois lugares que discordam.
 */
export class UpdatePathGeometryDto {
  @IsPathGeometry()
  geometry!: CoordinateTuple[];
}
