import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { validateConfig } from './config/env.validation.js';

async function bootstrap() {
  const config = validateConfig(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  configureApp(app, { corsOrigins: config.corsOrigins });

  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');

  Logger.log(
    `API disponível em http://localhost:${config.port} (${config.nodeEnv})`,
    'Bootstrap',
  );
}

await bootstrap();
