import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';

export type HealthResponse = {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  database: {
    status: 'up' | 'down';
    latencyMs: number | null;
  };
  timestamp: string;
};

const SERVICE_NAME = 'accessevent-api';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const database = await this.database.ping();
    const isHealthy = database.status === 'up';

    const response: HealthResponse = {
      status: isHealthy ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      version: process.env.APP_VERSION ?? '0.0.1',
      environment: process.env.NODE_ENV ?? 'development',
      database,
      timestamp: new Date().toISOString(),
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
