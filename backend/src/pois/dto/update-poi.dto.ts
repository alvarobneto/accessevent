import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { IsPoiAnchor, IsPoiRect } from '../../common/is-poi-geometry.js';
import { IsBoundedName } from '../../common/is-bounded-name.js';
import type { PoiAnchor, PoiRect } from '../poi-anchor.js';
import { PoiTypeValues } from '../poi.entity.js';

/**
 * Atualiza um ponto de interesse.
 *
 * Aceita partes: nome, tipo, retângulo, âncora, descrição e informações de
 * acessibilidade. Não aceita mapId (não se move POI entre mapas).
 *
 * A posição do ícone não é aceita: ela é derivada de `rect` + `anchor`.
 */
export class UpdatePoiDto {
  @IsOptional()
  @IsBoundedName('do ponto de interesse', 120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(PoiTypeValues)
  type?: (typeof PoiTypeValues)[number];

  /**
   * Retângulo novo, em dois cantos opostos.
   *
   * Mover ou redimensionar o retângulo **não** move o ícone: a âncora continua a
   * mesma, e é ela que decide onde o ícone fica dentro do quadro novo. Redimensionar
   * é o que faz o ícone acompanhar o retângulo, então quem muda o retângulo não
   * precisa mandar âncora junto.
   */
  @IsOptional()
  @IsPoiRect()
  rect?: PoiRect;

  /** Nova âncora do ícone dentro do retângulo. */
  @IsOptional()
  @IsPoiAnchor()
  anchor?: PoiAnchor;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  accessibilityInfo?: string | null;
}
