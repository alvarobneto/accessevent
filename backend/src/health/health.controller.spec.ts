import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../database/database.service.js';
import { HealthController } from './health.controller.js';

type PingResult = { status: 'up' | 'down'; latencyMs: number | null };

describe('HealthController (unit)', () => {
  const ping = vi
    .fn<() => Promise<PingResult>>()
    .mockResolvedValue({ status: 'up', latencyMs: 3.14 });
  const database = { ping } as unknown as DatabaseService;

  let controller: HealthController;

  beforeEach(async () => {
    vi.clearAllMocks();
    ping.mockResolvedValue({ status: 'up', latencyMs: 3.14 });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DatabaseService, useValue: database }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns "ok" when the database is reachable', async () => {
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toEqual({ status: 'up', latencyMs: 3.14 });
    expect(result.service).toBe('accessevent-api');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('throws 503 with the payload when the database is down', async () => {
    ping.mockResolvedValueOnce({ status: 'down', latencyMs: null });

    await expect(controller.check()).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({ status: 'degraded' }),
    });
  });
});
