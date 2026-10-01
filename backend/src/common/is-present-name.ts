import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

/**
 * Nomes são obrigatórios e guardados já sem as pontas em branco, mas
 * `@IsNotEmpty()` sozinho aceita `"   "`: uma string só com espaços passa e
 * chega ao banco como nome vazio.
 *
 * Um único `@Matches(/\S/)` cobre os dois casos — string vazia e string só com
 * espaços — e evita a mensagem duplicada que apareceria ao empilhar
 * `IsNotEmpty` com `Matches`: os dois reprovariam em `''` e o `ValidationPipe`
 * manda as duas cópias para o app exibir a mesma frase duas vezes.
 *
 * O `trim()` fica no service, não aqui: `class-transformer` não converte o
 * valor, só valida.
 */
export function IsPresentName(message: string) {
  return applyDecorators(Matches(/\S/, { message }));
}
