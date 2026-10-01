import { ValidationPipe, type INestApplication } from '@nestjs/common';

export type AppSetupOptions = {
  /** `['*']` libera qualquer origem; use a lista de `CORS_ORIGINS` em produção. */
  corsOrigins: string[];
};

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
    }),
  );
}
