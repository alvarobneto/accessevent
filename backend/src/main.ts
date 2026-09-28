import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { validateConfig } from './config/env.validation.js';

async function bootstrap() {
  const config = validateConfig(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.enableCors({
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
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

  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');

  Logger.log(
    `API disponível em http://localhost:${config.port} (${config.nodeEnv})`,
    'Bootstrap',
  );
}

await bootstrap();
