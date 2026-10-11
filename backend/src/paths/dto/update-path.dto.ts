import { ValidateIf } from 'class-validator';

import { IsBoundedName } from '../../common/is-bounded-name.js';

/**
 * Corpo do `PATCH /paths/:pathId`.
 *
 * Só o nome, como o `PATCH /maps/:mapId`: o trajeto gravado não é reescrito por
 * aqui. A geometria tem o contrato próprio dela, o `PATCH /paths/:pathId/geometry`
 * (`UpdatePathGeometryDto`) — aceitá-la neste DTO faria um `PATCH` de nome
 * reescrever o trajeto sem querer.
 *
 * O campo é opcional de propósito, mas `@ValidateIf` em vez de `@IsOptional`:
 * omitting o nome significa "não muda", enquanto `null` é erro de cliente e
 * precisa dizer. `@IsOptional` pula nos dois casos, e o `PATCH` responderia `200`
 * sem ter mudado nada.
 */
export class UpdatePathDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoundedName('do caminho')
  name?: string;
}
