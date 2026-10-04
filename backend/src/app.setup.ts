import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export type AppSetupOptions = {
  /** `['*']` libera qualquer origem; use a lista de `CORS_ORIGINS` em produção. */
  corsOrigins: string[];
};

/**
 * Chave que o `class-validator` dá ao erro de campo que não existe no DTO, e a
 * mensagem que ele escreveria sozinho: `property distance should not exist`.
 */
const WHITELIST_CONSTRAINT = 'whitelistValidation';

/**
 * Configuração global da aplicação. `main.ts` e os testes e2e chamam esta
 * função, então o `ValidationPipe` não pode divergir entre os dois: sem isso os
 * testes passariam sem cobrir as mensagens de erro que o app mostra na tela.
 */
export function configureApp(
  app: INestApplication,
  options: AppSetupOptions,
): void {
  app.enableCors({
    origin: options.corsOrigins.includes('*') ? true : options.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );
}

/**
 * Monta o `400` da validação com as mensagens em pt-BR.
 *
 * Só o texto do `forbidNonWhitelisted` precisa de tradução: as validações dos
 * DTOs trazem mensagem própria, e o que sobrava era o padrão do
 * `class-validator`, em inglês. O app mostra esse texto na tela
 * (`ApiError` no `mobile/src/services/apiClient.ts` extrai o `message` do corpo
 * e não traduz nada), então um campo a mais no corpo aparecia para o organizador
 * como `property distance should not exist` — inglês, e sem dizer o que fazer.
 *
 * A tradução fica aqui, no pipe global, e não em cada DTO: a regra é do
 * `forbidNonWhitelisted`, que é global, e um tratamento por endpoint deixaria a
 * mesma classe de erro com dois comportamentos na API.
 *
 * O resto é o mesmo desenho do `exceptionFactory` padrão do Nest — achatar os
 * erros aninhados em uma lista de frases e responder `400` — para que a troca
 * mude só o idioma.
 */
function validationExceptionFactory(
  errors: readonly ValidationError[],
): BadRequestException {
  const messages = collectValidationMessages(errors);

  return new BadRequestException(
    messages.length > 0
      ? messages
      : 'Dados inválidos. Confira o que você enviou.',
  );
}

/**
 * Achata as mensagens de validação, traduzindo o erro de campo desconhecido.
 *
 * O caminho do campo é montado na descida (`geometry.0.latitude`) porque o erro
 * aninhado chega com só o nome da propriedade interna, e um `distance` dito sem
 * contexto não ajuda a descobrir de onde ele veio.
 */
function collectValidationMessages(
  errors: readonly ValidationError[],
  parentPath = '',
): string[] {
  return errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    const own = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) =>
        constraint === WHITELIST_CONSTRAINT && path
          ? `O campo "${path}" não faz parte deste recurso.`
          : message,
    );

    return [...own, ...collectValidationMessages(error.children ?? [], path)];
  });
}
