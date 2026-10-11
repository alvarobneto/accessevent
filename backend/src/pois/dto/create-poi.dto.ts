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

export class CreatePoiDto {
  /**
   * Nome do ponto, **opcional**.
   *
   * A coluna é `NOT NULL` e continua sendo: a diferença entre "não tem nome" e
   * "não foi informado o nome" é da interface, e o banco não tem por que carregar
   * essa diferença. Quem preenche sem nome manda `name` ausente e o `PoisService`
   * grava o próprio `type` — o que a pessoa sabe dizer sobre o ponto sem ter
   * digitado rótulo algum. Não é descrição inventada (PRD §19): é o tipo que o
   * organizador escolheu na lista, e é o que a lista e o marcador mostram.
   */
  @IsOptional()
  @IsBoundedName('do ponto de interesse', 120)
  name?: string;

  @IsString()
  @IsIn(PoiTypeValues)
  type: (typeof PoiTypeValues)[number];

  /**
   * Retângulo que marca o ponto, em dois cantos opostos.
   *
   * **Obrigatório**, e é o que o serviço normaliza antes de gravar: os cantos
   * podem vir em qualquer ordem, porque quem desenha arrastando solta o dedo
   * onde der.
   */
  @IsPoiRect()
  rect: PoiRect;

  /**
   * Onde o ícone fica dentro do retângulo, em fração.
   *
   * A posição absoluta do ícone é derivada pela API, então o cliente manda a
   * âncora e não o ponto. Ver `poi-anchor.ts`.
   */
  @IsPoiAnchor()
  anchor: PoiAnchor;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  accessibilityInfo?: string;
}
