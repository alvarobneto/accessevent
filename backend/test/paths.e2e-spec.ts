import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { Repository } from 'typeorm';

import { configureApp } from '../src/app.setup.js';
import type { CoordinateTuple } from '../src/common/is-coordinate.js';
import { MapEntity } from '../src/maps/map.entity.js';
import { PathEntity } from '../src/paths/path.entity.js';
import { PathsModule } from '../src/paths/paths.module.js';

/**
 * E2E dos endpoints de caminho. Repositórios dublês mantêm o teste longe do
 * PostgreSQL; a chave estrangeira com `ON DELETE CASCADE` é verificada pela
 * migração, não aqui.
 */
type PathRow = {
  id: string;
  mapId: string;
  geometry: CoordinateTuple[];
  distance: number;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const EXISTING_MAP_ID = '33333333-3333-4333-8333-333333333333';

/** Três pontos formando um `L` de 55,6 m + 55,6 m. */
const L_TRAIL: CoordinateTuple[] = [
  [0, 0],
  [0.0005, 0],
  [0.0005, 0.0005],
];

function createRepositoryMocks() {
  const paths: PathRow[] = [];
  const knownMaps = new Set([EXISTING_MAP_ID]);
  let sequence = 0;
  const nextId = () =>
    `44444444-4444-4444-8444-${String(++sequence).padStart(12, '0')}`;

  const pathsRepository = {
    async find({ where }: { where: { mapId: string } }) {
      return paths
        .filter((row) => row.mapId === where.mapId)
        .sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        ) as PathEntity[];
    },
    async findOne({ where }: { where: { id: string } }) {
      return (paths.find((row) => row.id === where.id) as PathEntity) ?? null;
    },
    create(entity: Partial<PathRow>) {
      return entity as PathEntity;
    },
    async save(entity: Partial<PathRow>) {
      const now = new Date('2026-09-02T10:00:00.000Z');
      const row: PathRow = {
        id: entity.id ?? nextId(),
        mapId: entity.mapId ?? EXISTING_MAP_ID,
        geometry: entity.geometry ?? [],
        distance: entity.distance ?? 0,
        name: entity.name ?? null,
        createdAt: now,
        updatedAt: now,
      };
      const index = paths.findIndex((item) => item.id === row.id);
      if (index >= 0) paths[index] = row;
      else paths.push(row);
      return row as PathEntity;
    },
    async remove(entity: PathEntity) {
      const index = paths.findIndex((row) => row.id === entity.id);
      if (index >= 0) paths.splice(index, 1);
      return entity;
    },
  };

  const mapsRepository = {
    async exists({ where }: { where: { id: string } }) {
      return knownMaps.has(where.id);
    },
  };

  return { pathsRepository, mapsRepository, paths };
}

describe('/maps/:mapId/paths e /paths/:pathId (e2e)', () => {
  let app: INestApplication<App>;
  let paths: PathRow[];

  beforeEach(async () => {
    const mocks = createRepositoryMocks();
    paths = mocks.paths;

    const moduleRef = await Test.createTestingModule({ imports: [PathsModule] })
      .overrideProvider(getRepositoryToken(PathEntity))
      .useValue(mocks.pathsRepository as unknown as Repository<PathEntity>)
      .overrideProvider(getRepositoryToken(MapEntity))
      .useValue(mocks.mapsRepository as unknown as Repository<MapEntity>)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app as INestApplication, { corsOrigins: ['*'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('salva um caminho e devolve 201 com a distância calculada', async () => {
    const response = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    expect(response.body).toMatchObject({
      mapId: EXISTING_MAP_ID,
      geometry: L_TRAIL,
      // 55,6 m + 55,6 m do `L`, e não 78,6 m da ponta à ponta.
      distance: 111.2,
    });
    expect(response.body.id).toBeDefined();
  });

  it('rejeita uma distância enviada pelo app em vez de calculá-la', async () => {
    const response = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL, distance: 1 })
      .expect(400);

    expect(response.body.message).toEqual([
      'O campo "distance" não faz parte deste recurso.',
    ]);
    expect(paths).toHaveLength(0);
  });

  it('lista os caminhos da navegação na ordem da gravação', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({
        geometry: [
          [1, 1],
          [1.001, 1],
        ],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/maps/${EXISTING_MAP_ID}/paths`)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].geometry).toEqual(L_TRAIL);
    expect(response.body[1].geometry[0]).toEqual([1, 1]);
  });

  it('busca um caminho pelo id', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/paths/${created.body.id}`)
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body.createdAt).toBe('2026-09-02T10:00:00.000Z');
  });

  it('renomeia um caminho e devolve 200 com o nome gravado', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({ name: 'Corredor central' })
      .expect(200);

    expect(response.body.name).toBe('Corredor central');

    const listed = await request(app.getHttpServer())
      .get(`/maps/${EXISTING_MAP_ID}/paths`)
      .expect(200);

    expect(listed.body[0].name).toBe('Corredor central');
  });

  it('guarda o nome já sem as pontas em branco', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({ name: '  Corredor central  ' })
      .expect(200);

    expect(response.body.name).toBe('Corredor central');
  });

  it('devolve o caminho sem nome quando ele ainda não foi nomeado', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    expect(created.body.name).toBeNull();
  });

  it('não reescreve a geometria nem a distância ao renomear', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({ name: 'Corredor central' })
      .expect(200);

    expect(response.body.geometry).toEqual(L_TRAIL);
    expect(response.body.distance).toBe(111.2);
  });

  it('rejeita renomear com nome vazio ou só com espaços', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({ name: '' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(['Informe o nome do caminho.']);
      });

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({ name: '   ' })
      .expect(400);

    expect(paths[0]?.name).toBeNull();
  });

  it('rejeita renomear com nome null em vez de fingir que gravou', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({ name: null })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(['O nome do caminho deve ser um texto.']);
      });
  });

  it('rejeita geometria enviada no PATCH de renomear', async () => {
    // A geometria gravada não é reescrita por aqui: reescrever o trajeto de um
    // caminho a partir do endpoint do nome seria um `PATCH` de nome destruindo a
    // geometria que o organizador percorreu.
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({
        name: 'Corredor central',
        geometry: [
          [0, 0],
          [0.001, 0.001],
        ],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'O campo "geometry" não faz parte deste recurso.',
        ]);
      });

    const stored = await request(app.getHttpServer())
      .get(`/paths/${created.body.id}`)
      .expect(200);

    expect(stored.body.geometry).toEqual(L_TRAIL);
  });

  it('rejeita nome com mais de 120 caracteres', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}`)
      .send({ name: 'x'.repeat(121) })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'O nome do caminho deve ter no máximo 120 caracteres.',
        ]);
      });
  });

  it('devolve 404 ao renomear caminho inexistente', async () => {
    await request(app.getHttpServer())
      .patch('/paths/00000000-0000-0000-0000-000000000000')
      .send({ name: 'Corredor central' })
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Caminho não encontrado.');
      });
  });

  it('apaga um caminho e devolve 204 sem corpo', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/paths/${created.body.id}`)
      .expect(204);

    expect(response.text).toBe('');
    expect(paths).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/paths/${created.body.id}`)
      .expect(404);
  });

  it('mantém os outros caminhos ao apagar um', async () => {
    const removed = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);
    const kept = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({
        geometry: [
          [2, 2],
          [2.001, 2],
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/paths/${removed.body.id}`)
      .expect(204);

    const listed = await request(app.getHttpServer())
      .get(`/maps/${EXISTING_MAP_ID}/paths`)
      .expect(200);

    expect(listed.body.map((path: { id: string }) => path.id)).toEqual([
      kept.body.id,
    ]);
  });

  it('substitui a geometria ajustada e recalcula a distância', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    const adjusted: CoordinateTuple[] = [
      [0, 0],
      [0.0005, 0.0001],
      [0.0005, 0.0005],
    ];

    const response = await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}/geometry`)
      .send({ geometry: adjusted })
      .expect(200);

    expect(response.body.geometry).toEqual(adjusted);
    // Só o vértice do meio mudou; a distância é recalculada a partir dos mesmos
    // três índices, sem simplificar a quina original.
    expect(response.body.distance).toBeLessThan(111.2);

    const stored = await request(app.getHttpServer())
      .get(`/paths/${created.body.id}`)
      .expect(200);

    expect(stored.body.geometry).toEqual(adjusted);
  });

  it('rejeita ajustes que acrescentam ou removem pontos do rastro', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    for (const geometry of [
      [
        [0, 0],
        [0.0005, 0],
      ],
      [
        [0, 0],
        [0.0005, 0],
        [0.001, 0],
        [0.0015, 0],
      ],
    ]) {
      await request(app.getHttpServer())
        .patch(`/paths/${created.body.id}/geometry`)
        .send({ geometry })
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toBe(
            'O ajuste não pode adicionar ou remover pontos do trajeto.',
          );
        });
    }

    const stored = await request(app.getHttpServer())
      .get(`/paths/${created.body.id}`)
      .expect(200);

    expect(stored.body.geometry).toEqual(L_TRAIL);
  });

  it('rejeita ajuste que deixa o trajeto sem comprimento', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}/geometry`)
      .send({
        geometry: [
          [1, 1],
          [1, 1],
          [1, 1],
        ],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'O trajeto ajustado tem comprimento zero. Desfaça os ajustes.',
        );
      });

    // A geometria original fica intacta: um ajuste recusado não pode apagar o
    // trajeto que o organizador percorreu.
    const stored = await request(app.getHttpServer())
      .get(`/paths/${created.body.id}`)
      .expect(200);

    expect(stored.body.geometry).toEqual(L_TRAIL);
    expect(stored.body.distance).toBe(111.2);
  });

  it('rejeita distância enviada no ajuste de geometria', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}/geometry`)
      .send({ geometry: L_TRAIL, distance: 1 })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'O campo "distance" não faz parte deste recurso.',
        ]);
      });
  });

  it('rejeita ajuste com um único ponto', async () => {
    const created = await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/paths/${created.body.id}/geometry`)
      .send({ geometry: [[0, 0]] })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'Um caminho precisa de pelo menos 2 pontos.',
        ]);
      });
  });

  it('devolve 404 ao ajustar geometria de caminho inexistente', async () => {
    await request(app.getHttpServer())
      .patch('/paths/00000000-0000-0000-0000-000000000000/geometry')
      .send({ geometry: L_TRAIL })
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Caminho não encontrado.');
      });
  });

  it('devolve 404 ao apagar caminho inexistente', async () => {
    await request(app.getHttpServer())
      .delete('/paths/00000000-0000-0000-0000-000000000000')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Caminho não encontrado.');
      });
  });

  it('devolve 404 ao buscar caminho inexistente', async () => {
    await request(app.getHttpServer())
      .get('/paths/00000000-0000-0000-0000-000000000000')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Caminho não encontrado.');
      });
  });

  it('devolve 404 ao salvar ou listar caminhos de navegação inexistente', async () => {
    await request(app.getHttpServer())
      .post('/maps/00000000-0000-0000-0000-000000000000/paths')
      .send({ geometry: L_TRAIL })
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Navegação não encontrada.');
      });

    await request(app.getHttpServer())
      .get('/maps/00000000-0000-0000-0000-000000000000/paths')
      .expect(404);

    expect(paths).toHaveLength(0);
  });

  it('devolve 400 e não 500 quando o mapId não é um UUID', async () => {
    await request(app.getHttpServer())
      .post('/maps/nao-e-um-uuid/paths')
      .send({ geometry: L_TRAIL })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Identificador inválido. Informe um UUID válido.',
        );
      });
  });

  it('rejeita geometria com um único ponto', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: [[0, 0]] })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'Um caminho precisa de pelo menos 2 pontos.',
        ]);
      });

    expect(paths).toHaveLength(0);
  });

  it('rejeita geometria sem pontos', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: [] })
      .expect(400);

    expect(paths).toHaveLength(0);
  });

  it('rejeita ponto que não é par de números', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: [[0, 0], [0.001]] })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'Cada ponto do caminho deve ser um par [latitude, longitude].',
        ]);
      });

    expect(paths).toHaveLength(0);
  });

  it('rejeita coordenada fora da faixa do globo', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({
        geometry: [
          [0, 0],
          [91, 0],
        ],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'Cada ponto do caminho deve ser um par [latitude, longitude].',
        ]);
      });

    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({
        geometry: [
          [0, 0],
          [0, 181],
        ],
      })
      .expect(400);

    expect(paths).toHaveLength(0);
  });

  it('rejeita coordenada com texto no lugar do número', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({
        geometry: [
          [0, 0],
          ['0.001', 0],
        ],
      })
      .expect(400);

    expect(paths).toHaveLength(0);
  });

  it('rejeita geometria que não é lista', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: 'entrada-elevador' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual([
          'A geometria do caminho deve ser uma lista de pontos [latitude, longitude].',
        ]);
      });
  });

  it('rejeita mapId no corpo da criação de caminho', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({ geometry: L_TRAIL, mapId: 'outra-navegacao' })
      .expect(400);

    expect(paths).toHaveLength(0);
  });

  it('rejeita caminho sem geometria', async () => {
    await request(app.getHttpServer())
      .post(`/maps/${EXISTING_MAP_ID}/paths`)
      .send({})
      .expect(400);

    expect(paths).toHaveLength(0);
  });
});
