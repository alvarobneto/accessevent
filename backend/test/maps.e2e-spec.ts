import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { Repository } from 'typeorm';

import { configureApp } from '../src/app.setup.js';
import { EventEntity } from '../src/events/event.entity.js';
import { MapsModule } from '../src/maps/maps.module.js';
import { MapEntity } from '../src/maps/map.entity.js';

/**
 * E2E dos endpoints de navegação. Repositórios dublês mantêm o teste longe do
 * PostgreSQL; a chave estrangeira com `ON DELETE CASCADE` é verificada pela
 * migração, não aqui.
 */
type MapRow = {
  id: string;
  eventId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

const EXISTING_EVENT_ID = '11111111-1111-4111-8111-111111111111';

function createRepositoryMocks() {
  const maps: MapRow[] = [];
  const knownEvents = new Set([EXISTING_EVENT_ID]);
  let sequence = 0;
  // Os controllers validam o id com `ParseUuidPipe`, então o id sintético
  // precisa parecer um UUID — um `map-1` faria o GET/PATCH responder 400.
  const nextId = () =>
    `22222222-2222-4222-8222-${String(++sequence).padStart(12, '0')}`;

  const mapsRepository = {
    async find({ where }: { where: { eventId: string } }) {
      return maps
        .filter((row) => row.eventId === where.eventId)
        .sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        ) as MapEntity[];
    },
    async findOne({ where }: { where: { id: string } }) {
      return (maps.find((row) => row.id === where.id) as MapEntity) ?? null;
    },
    create(entity: Partial<MapRow>) {
      return entity as MapEntity;
    },
    async save(entity: Partial<MapRow>) {
      const now = new Date('2026-09-01T10:00:00.000Z');
      const row: MapRow = {
        id: entity.id ?? nextId(),
        eventId: entity.eventId ?? EXISTING_EVENT_ID,
        name: entity.name ?? '',
        createdAt: now,
        updatedAt: now,
      };
      const index = maps.findIndex((item) => item.id === row.id);
      if (index >= 0) maps[index] = row;
      else maps.push(row);
      return row as MapEntity;
    },
    async remove(entity: MapEntity) {
      const index = maps.findIndex((row) => row.id === entity.id);
      if (index >= 0) maps.splice(index, 1);
      return entity;
    },
  };

  const eventsRepository = {
    async exists({ where }: { where: { id: string } }) {
      return knownEvents.has(where.id);
    },
  };

  return { mapsRepository, eventsRepository, maps };
}

describe('/events/:eventId/maps e /maps/:mapId (e2e)', () => {
  let app: INestApplication<App>;
  let maps: MapRow[];

  beforeEach(async () => {
    const mocks = createRepositoryMocks();
    maps = mocks.maps;

    const moduleRef = await Test.createTestingModule({ imports: [MapsModule] })
      .overrideProvider(getRepositoryToken(MapEntity))
      .useValue(mocks.mapsRepository as unknown as Repository<MapEntity>)
      .overrideProvider(getRepositoryToken(EventEntity))
      .useValue(mocks.eventsRepository as unknown as Repository<EventEntity>)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app as INestApplication, { corsOrigins: ['*'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('cria uma navegação dentro do evento e devolve 201', async () => {
    const response = await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Térreo' })
      .expect(201);

    expect(response.body).toMatchObject({
      eventId: EXISTING_EVENT_ID,
      name: 'Térreo',
    });
    expect(response.body.id).toBeDefined();
  });

  it('lista as navegações do evento', async () => {
    await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Térreo' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Primeiro andar' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/events/${EXISTING_EVENT_ID}/maps`)
      .expect(200);

    expect(response.body.map((map: { name: string }) => map.name)).toEqual([
      'Térreo',
      'Primeiro andar',
    ]);
  });

  it('busca e renomeia uma navegação pelo id', async () => {
    const created = await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Térreo' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/maps/${created.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Térreo');
      });

    const renamed = await request(app.getHttpServer())
      .patch(`/maps/${created.body.id}`)
      .send({ name: 'Térreo — pavilhão A' })
      .expect(200);

    expect(renamed.body.name).toBe('Térreo — pavilhão A');
    expect(renamed.body.eventId).toBe(EXISTING_EVENT_ID);
  });

  it('apaga uma navegação e devolve 204 sem corpo', async () => {
    const created = await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Térreo' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/maps/${created.body.id}`)
      .expect(204);

    expect(response.text).toBe('');
    expect(maps).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/maps/${created.body.id}`)
      .expect(404);
  });

  it('mantém as outras navegações do evento ao apagar uma', async () => {
    const removed = await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Térreo' })
      .expect(201);
    const kept = await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Primeiro andar' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/maps/${removed.body.id}`)
      .expect(204);

    const listed = await request(app.getHttpServer())
      .get(`/events/${EXISTING_EVENT_ID}/maps`)
      .expect(200);

    expect(listed.body.map((map: { name: string }) => map.name)).toEqual([
      'Primeiro andar',
    ]);
    expect(kept.body.id).toBeDefined();
  });

  it('devolve 404 ao apagar navegação inexistente', async () => {
    await request(app.getHttpServer())
      .delete('/maps/00000000-0000-0000-0000-000000000000')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Navegação não encontrada.');
      });

    expect(maps).toHaveLength(0);
  });

  it('devolve 400 e não 500 ao apagar navegação com id que não é UUID', async () => {
    await request(app.getHttpServer())
      .delete('/maps/nao-e-um-uuid')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Identificador inválido. Informe um UUID válido.',
        );
      });
  });

  it('devolve 404 ao criar navegação em evento inexistente', async () => {
    await request(app.getHttpServer())
      .post('/events/00000000-0000-0000-0000-000000000000/maps')
      .send({ name: 'Térreo' })
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Evento não encontrado.');
      });

    expect(maps).toHaveLength(0);
  });

  it('devolve 404 ao listar navegações de evento inexistente', async () => {
    await request(app.getHttpServer())
      .get('/events/00000000-0000-0000-0000-000000000000/maps')
      .expect(404);
  });

  it('devolve 404 ao buscar ou renomear navegação inexistente', async () => {
    await request(app.getHttpServer())
      .get('/maps/00000000-0000-0000-0000-000000000000')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Navegação não encontrada.');
      });

    await request(app.getHttpServer())
      .patch('/maps/00000000-0000-0000-0000-000000000000')
      .send({ name: 'Térreo' })
      .expect(404);
  });

  it('rejeita navegação sem nome', async () => {
    await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: '' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(['Informe o nome da navegação.']);
      });
  });

  it('rejeita nome de navegação só com espaços', async () => {
    await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: '   ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(['Informe o nome da navegação.']);
      });

    expect(maps).toHaveLength(0);
  });

  it('devolve 400 e não 500 quando o eventId do caminho não é um UUID', async () => {
    await request(app.getHttpServer())
      .post('/events/nao-e-um-uuid/maps')
      .send({ name: 'Térreo' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Identificador inválido. Informe um UUID válido.',
        );
      });
  });

  it('rejeita eventoId no corpo da criação de navegação', async () => {
    await request(app.getHttpServer())
      .post(`/events/${EXISTING_EVENT_ID}/maps`)
      .send({ name: 'Térreo', eventId: 'outro-evento' })
      .expect(400);

    expect(maps).toHaveLength(0);
  });
});
