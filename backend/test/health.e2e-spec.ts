import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { DatabaseService } from '../src/database/database.service.js';
import { HealthModule } from '../src/health/health.module.js';

/**
 * E2E do endpoint público `/health`.
 *
 * O `DatabaseService` é substituído por um dublê para que o teste rode sem o
 * PostgreSQL no ar. A verificação real de banco acontece no `/health` de
 * integração, coberto pelo docker-compose.
 */
type PingResult = { status: 'up' | 'down'; latencyMs: number | null };

describe('GET /health (e2e)', () => {
  let app: INestApplication<App>;
  const ping = vi
    .fn<() => Promise<PingResult>>()
    .mockResolvedValue({ status: 'up', latencyMs: 1.2 });
  const database = { ping } as unknown as DatabaseService;

  beforeEach(async () => {
    vi.clearAllMocks();
    ping.mockResolvedValue({ status: 'up', latencyMs: 1.2 });

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde 200 com o status do serviço e do banco', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'accessevent-api',
      database: { status: 'up' },
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('responde 503 quando o banco está indisponível', async () => {
    ping.mockResolvedValueOnce({ status: 'down', latencyMs: null });

    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(503);

    expect(response.body).toMatchObject({
      status: 'degraded',
      database: { status: 'down' },
    });
  });
});
