import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { Repository } from 'typeorm';

import { configureApp } from '../src/app.setup.js';
import { EventEntity } from '../src/events/event.entity.js';
import { EventsModule } from '../src/events/events.module.js';

/**
 * E2E dos endpoints de eventos.
 *
 * O repositório do TypeORM é substituído por um dublê em memória para que o teste
 * rode sem o PostgreSQL no ar — a verificação real de banco fica com a
 * migração e com o docker-compose. O `ValidationPipe` vem de `configureApp`, o
 * mesmo usado por `main.ts`, então os 400 exercitados aqui são os que o app
 * recebe de verdade.
 */
type EventRow = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createRepositoryMock() {
  const rows: EventRow[] = [];
  let sequence = 0;
  // O controller valida o id com `ParseUuidPipe`, então o id sintético precisa
  // parecer um UUID — um `event-1` faria o GET/PATCH responder 400.
  const nextId = () =>
    `33333333-3333-4333-8333-${String(++sequence).padStart(12, '0')}`;

  const repository = {
    async find() {
      return [...rows].sort((a, b) =>
        a.name.localeCompare(b.name),
      ) as EventEntity[];
    },
    async findOne({ where }: { where: { id: string } }) {
      return (rows.find((row) => row.id === where.id) as EventEntity) ?? null;
    },
    create(entity: Partial<EventRow>) {
      return entity as EventEntity;
    },
    async save(entity: Partial<EventRow>) {
      const now = new Date('2026-09-01T10:00:00.000Z');
      const row: EventRow = {
        id: entity.id ?? nextId(),
        name: entity.name ?? '',
        description: entity.description ?? null,
        address: entity.address ?? null,
        startDate: entity.startDate ?? null,
        endDate: entity.endDate ?? null,
        createdAt: now,
        updatedAt: now,
      };
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return row as EventEntity;
    },
    async remove(entity: EventEntity) {
      const index = rows.findIndex((row) => row.id === entity.id);
      if (index >= 0) rows.splice(index, 1);
      return entity;
    },
  };

  return { rows, repository };
}

/** Id do primeiro evento criado no teste, já que o mock gera ids determinísticos. */
const FIRST_EVENT_ID = '33333333-3333-4333-8333-000000000001';

describe('/events (e2e)', () => {
  let app: INestApplication<App>;
  let rows: EventRow[];

  beforeEach(async () => {
    const { repository, rows: stored } = createRepositoryMock();
    rows = stored;

    const moduleRef = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(getRepositoryToken(EventEntity))
      .useValue(repository as unknown as Repository<EventEntity>)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app as INestApplication, { corsOrigins: ['*'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('cria um evento só com o nome e devolve 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira de Tecnologia Acessível' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: FIRST_EVENT_ID,
      name: 'Feira de Tecnologia Acessível',
      description: null,
      address: null,
      startDate: null,
      endDate: null,
    });
    expect(response.body.createdAt).toBeDefined();
  });

  it('cria um evento com endereço e datas', async () => {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send({
        name: 'Congresso Acessível',
        description: 'Pavilhões A e B',
        address: 'São Paulo, SP',
        startDate: '2026-10-05',
        endDate: '2026-10-08',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      address: 'São Paulo, SP',
      startDate: '2026-10-05',
      endDate: '2026-10-08',
    });
  });

  it('lista os eventos em ordem alfabética', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Congresso Acessível' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira de Tecnologia Acessível' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/events')
      .expect(200);

    expect(response.body.map((event: { name: string }) => event.name)).toEqual([
      'Congresso Acessível',
      'Feira de Tecnologia Acessível',
    ]);
  });

  it('devolve 200 com o evento pedido e 404 quando ele não existe', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/events/${created.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Feira');
      });

    await request(app.getHttpServer())
      .get('/events/00000000-0000-0000-0000-000000000000')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Evento não encontrado.');
      });
  });

  it('edita apenas os campos enviados no patch', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira', address: 'São Paulo, SP' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/events/${created.body.id}`)
      .send({ address: 'Curitiba, PR' })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Feira',
      address: 'Curitiba, PR',
      description: null,
    });
  });

  it('limpa um campo opcional quando o patch envia string vazia', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira', description: 'Pavilhões A e B' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/events/${created.body.id}`)
      .send({ description: '' })
      .expect(200);

    expect(response.body.description).toBeNull();
  });

  it('apaga um evento e devolve 204 sem corpo', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/events/${created.body.id}`)
      .expect(204);

    expect(response.text).toBe('');
    expect(rows).toHaveLength(0);
  });

  it('deixa de listar o evento apagado', async () => {
    const kept = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Congresso Acessível' })
      .expect(201);
    const removed = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/events/${removed.body.id}`)
      .expect(204);

    const listed = await request(app.getHttpServer())
      .get('/events')
      .expect(200);

    expect(listed.body.map((event: { id: string }) => event.id)).toEqual([
      kept.body.id,
    ]);
  });

  it('devolve 404 ao apagar evento inexistente', async () => {
    await request(app.getHttpServer())
      .delete('/events/00000000-0000-0000-0000-000000000000')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Evento não encontrado.');
      });
  });

  it('devolve 400 e não 500 ao apagar com id que não é UUID', async () => {
    await request(app.getHttpServer())
      .delete('/events/nao-e-um-uuid')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Identificador inválido. Informe um UUID válido.',
        );
      });
  });

  it('rejeita evento sem nome com mensagem em pt-BR', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: '' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(['Informe o nome do evento.']);
      });
  });

  it('rejeita nome só com espaços em vez de gravar um nome vazio', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: '   ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(['Informe o nome do evento.']);
      });
  });

  it('rejeita nome só com espaços no patch, que é opcional mas não vazio', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Evento para patch' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/events/${(created.body as { id: string }).id}`)
      .send({ name: '   ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(['Informe o nome do evento.']);
      });
  });

  it('devolve 400 e não 500 quando o id do evento não é um UUID', async () => {
    await request(app.getHttpServer())
      .get('/events/nao-e-um-uuid')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Identificador inválido. Informe um UUID válido.',
        );
      });
  });

  it('rejeita data fora do formato dd/mm/aaaa traduzido', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira', startDate: '05/10/2026' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'Informe a data no formato dd/mm/aaaa. Exemplo: 05/10/2026.',
        ]);
      });
  });

  it('rejeita data final anterior à inicial', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira', startDate: '2026-10-08', endDate: '2026-10-05' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'A data final do evento não pode ser anterior à data inicial.',
        );
      });

    expect(rows).toHaveLength(0);
  });

  it('rejeita campos fora do contrato, como organizerId', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'Feira', organizerId: 'user-1' })
      .expect(400);

    expect(rows).toHaveLength(0);
  });

  it('rejeita nome acima de 120 caracteres', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({ name: 'a'.repeat(121) })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'O nome do evento deve ter no máximo 120 caracteres.',
        ]);
      });
  });
});
