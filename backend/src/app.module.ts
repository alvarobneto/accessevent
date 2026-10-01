import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { databaseConfig } from './config/database.config.js';
import {
  validateConfig,
  type DatabaseSettings,
} from './config/env.validation.js';
import { buildTypeOrmOptions } from './database/typeorm.options.js';
import { EventsModule } from './events/events.module.js';
import { HealthModule } from './health/health.module.js';
import { MapsModule } from './maps/maps.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateConfig,
      load: [databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildTypeOrmOptions(config.getOrThrow<DatabaseSettings>('database')),
    }),
    HealthModule,
    EventsModule,
    MapsModule,
  ],
})
export class AppModule {}
