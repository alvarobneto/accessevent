import { registerDecorator } from 'class-validator';

import { isCoordinateTuple } from '../../common/is-coordinate.js';

/** Um caminho é um trecho entre dois pontos: com um só não há o que percorrer. */
export const MINIMUM_PATH_POINTS = 2;

/**
 * Teto de pontos por caminho, com 1 Hz de leitura (o `watchPosition` da Sprint 4)
 * dá 83 minutos de gravação contínua.
 *
 * Não é uma regra do produto, é um limite de sanidade: sem ele, um app com bug
 * poderia gravar um trajeto de milhões de pontos e encher a linha do banco com
 * dados que ninguém vai conseguir percorrer.
 */
export const MAXIMUM_PATH_POINTS = 5000;

/** Motivo da recusa, com a frase que o app mostra. */
export type GeometryProblem =
  'not-a-list' | 'too-few-points' | 'too-many-points' | 'invalid-coordinate';

const MESSAGES: Record<GeometryProblem, string> = {
  'not-a-list':
    'A geometria do caminho deve ser uma lista de pontos [latitude, longitude].',
  'too-few-points': `Um caminho precisa de pelo menos ${MINIMUM_PATH_POINTS} pontos.`,
  'too-many-points': `O caminho tem pontos demais (máximo de ${MAXIMUM_PATH_POINTS}).`,
  'invalid-coordinate':
    'Cada ponto do caminho deve ser um par [latitude, longitude].',
};

/**
 * Qual é o primeiro problema da geometria, ou `null` quando ela serve.
 *
 * A ordem é do mais estrutural para o mais detalhado de propósito: se o valor nem
 * é lista, avisar que faltam pontos ou que um ponto está torto é só ruído.
 */
export function checkPathGeometry(value: unknown): GeometryProblem | null {
  if (!Array.isArray(value)) return 'not-a-list';
  if (value.length < MINIMUM_PATH_POINTS) return 'too-few-points';
  if (value.length > MAXIMUM_PATH_POINTS) return 'too-many-points';

  return value.every(isCoordinateTuple) ? null : 'invalid-coordinate';
}

/**
 * Valida a geometria inteira em um validador só.
 *
 * `@IsArray` com `@ArrayMinSize` empilhado parece o jeito obvious, e é o que
 * produz quatro mensagens para o mesmo corpo inválido: o `ValidationPipe` manda
 * todas, e o app mostra a lista. Com `geometry: "entrada-elevador"` o organizador
 * leria "não é uma lista", "tem pontos demais", "precisa de pelo menos 2 pontos" e
 * "cada ponto deve ser um par" — quatro frases para um erro só.
 *
 * Aqui a regra devolve o primeiro problema e a frase correspondente, que é o que a
 * pessoa precisa ler.
 */
export function IsPathGeometry() {
  return function validateGeometry(
    target: object,
    propertyName: string | symbol,
  ): void {
    registerDecorator({
      name: 'isPathGeometry',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [],
      options: {},
      validator: {
        validate: (value: unknown) => checkPathGeometry(value) === null,
        defaultMessage: (args) => {
          const problem = checkPathGeometry(args?.value);
          return MESSAGES[problem ?? 'invalid-coordinate'];
        },
      },
    });
  };
}
