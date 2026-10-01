import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/**
 * `ParseUUIDPipe` do Nest, com duas correções que importam para o app:
 *
 * 1. **Sem fixar a versão.** `new ParseUUIDPipe({ version: '4' })` rejeita UUID
 *    válidos de outras versões (o nil-UUID `0000…0000`, por exemplo, que os
 *    testes usam para "recurso inexistente"). Deixar a versão em aberto ainda
 *    barram `nao-e-um-uuid`, que é o que interessa.
 * 2. **Mensagem em pt-BR.** O padrão é `"Validation failed (uuid is expected)"`
 *    em inglês, e o `ApiError` do app mostra a mensagem do backend como ela
 *    chega — o usuário leria texto em inglês numa interface pt-BR.
 *
 * Sem isso, um id malformado nem chega ao service: ia pro Postgres como
 * `invalid input syntax for type uuid` e saía como 500 em vez de 400.
 */
export function ParseUuidPipe(): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException(
        'Identificador inválido. Informe um UUID válido.',
      ),
  });
}
