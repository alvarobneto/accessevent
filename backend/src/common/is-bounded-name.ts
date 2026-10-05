import { registerDecorator } from 'class-validator';

/** Teto padrão de um nome. O mesmo para navegação e para caminho. */
export const DEFAULT_NAME_MAX_LENGTH = 120;

/** Motivo da recusa de um nome. */
export type NameProblem = 'not-a-text' | 'empty' | 'too-long';

/**
 * Primeiro problema de um nome, ou `null` quando ele serve.
 *
 * A ordem vai do mais estrutural para o mais detalhado: se o valor não é texto,
 * avisar que ele está vazio ou longo é ruído.
 *
 * `trim()` só para decidir: o valor gravado é o que o service grava, e quem
 * apara é ele, porque `class-transformer` valida mas não converte.
 */
export function checkName(
  value: unknown,
  maxLength: number = DEFAULT_NAME_MAX_LENGTH,
): NameProblem | null {
  if (typeof value !== 'string') return 'not-a-text';
  if (!/\S/.test(value)) return 'empty';
  if (value.length > maxLength) return 'too-long';

  return null;
}

/**
 * Valida o nome inteiro em um validador só.
 *
 * `@IsString` com `@IsPresentName` e `@MaxLength` empilhados parece o jeito
 * obvio, e é o que produz três frases para um corpo só: `{ name: null }` reprova
 * nos três ao mesmo tempo, e o `ValidationPipe` manda as três mensagens para o
 * app exibir a lista inteira. Um campo que a pessoa preencheu com um valor só
 * merece uma resposta que diz o que mudar.
 *
 * `IsPresentName` continua existindo porque ele é metade deste problema — a
 * parte que reprova string vazia e string só com espaços — e ele já tem a
 * explicação de por que `@IsNotEmpty()` sozinho não basta.
 */
export function IsBoundedName(
  label: string,
  maxLength: number = DEFAULT_NAME_MAX_LENGTH,
) {
  const messages: Record<NameProblem, string> = {
    'not-a-text': `O nome ${label} deve ser um texto.`,
    empty: `Informe o nome ${label}.`,
    'too-long': `O nome ${label} deve ter no máximo ${maxLength} caracteres.`,
  };

  return function validateName(
    target: object,
    propertyName: string | symbol,
  ): void {
    registerDecorator({
      name: 'isBoundedName',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [],
      options: {},
      validator: {
        validate: (value: unknown) => checkName(value, maxLength) === null,
        defaultMessage: (args) =>
          messages[checkName(args?.value, maxLength) ?? 'not-a-text'],
      },
    });
  };
}
