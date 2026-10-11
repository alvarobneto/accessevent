import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type { CoordinateTuple } from '../common/is-coordinate.js';
import { MapEntity } from '../maps/map.entity.js';
import { PathEntity } from './path.entity.js';
import { PathsService } from './paths.service.js';

type PathRow = {
  id: string;
  mapId: string;
  geometry: CoordinateTuple[];
  distance: number;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Dois pontos a 111 m de distância na latitude do Equador: 0,001 grau. */
const TWO_POINTS: CoordinateTuple[] = [
  [0, 0],
  [0.001, 0],
];

function makeRow(overrides: Partial<PathRow> = {}): PathRow {
  return {
    id: 'path-1',
    mapId: 'map-1',
    geometry: TWO_POINTS,
    distance: 111.2,
    name: null,
    createdAt: new Date('2026-09-02T10:00:00.000Z'),
    updatedAt: new Date('2026-09-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('PathsService (unit)', () => {
  const create = vi.fn<Repository<PathEntity>['create']>();
  const save = vi.fn<(entity: PathEntity) => Promise<PathEntity>>();
  const find = vi.fn<() => Promise<PathEntity[]>>();
  const findOne = vi.fn<() => Promise<PathEntity | null>>();
  const remove = vi.fn<(entity: PathEntity) => Promise<PathEntity>>();
  const paths = {
    create,
    save,
    find,
    findOne,
    remove,
  } as unknown as Repository<PathEntity>;

  const exists = vi.fn<() => Promise<boolean>>();
  const maps = { exists } as unknown as Repository<MapEntity>;

  let service: PathsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((entity) => entity as PathEntity);
    save.mockImplementation(async (entity) => makeRow(entity as PathRow));
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    exists.mockResolvedValue(true);
    remove.mockImplementation(async (entity) => entity);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PathsService,
        { provide: getRepositoryToken(PathEntity), useValue: paths },
        { provide: getRepositoryToken(MapEntity), useValue: maps },
      ],
    }).compile();

    service = moduleRef.get(PathsService);
  });

  it('lists the paths of a map in creation order', async () => {
    find.mockResolvedValue([makeRow({ id: 'a' }), makeRow({ id: 'b' })]);

    const result = await service.findAllByMap('map-1');

    expect(find).toHaveBeenCalledWith({
      where: { mapId: 'map-1' },
      order: { createdAt: 'ASC' },
    });
    expect(result.map((path) => path.id)).toEqual(['a', 'b']);
  });

  it('throws 404 when listing the paths of an unknown map', async () => {
    exists.mockResolvedValue(false);

    await expect(service.findAllByMap('missing')).rejects.toMatchObject({
      status: 404,
    });

    expect(find).not.toHaveBeenCalled();
  });

  it('throws 404 when creating a path under an unknown map', async () => {
    exists.mockResolvedValue(false);

    await expect(
      service.create('missing', { geometry: TWO_POINTS }),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(create).not.toHaveBeenCalled();
  });

  it('computes the distance from the geometry instead of trusting the body', async () => {
    const result = await service.create('map-1', { geometry: TWO_POINTS });

    expect(create).toHaveBeenCalledWith({
      mapId: 'map-1',
      geometry: TWO_POINTS,
      distance: 111.2,
    });
    // O corpo nem tem `distance`: um cliente que mandasse um valor errado receberia
    // 400 pelo `forbidNonWhitelisted`, e não um caminho gravado com número falso.
    expect(result.distance).toBe(111.2);
  });

  it('sums the segments of the trail', async () => {
    // Ida e volta de 55,6 m: o percurso é o dobro do deslocamento.
    const trail: CoordinateTuple[] = [
      [0, 0],
      [0.0005, 0],
      [0, 0],
    ];

    await service.create('map-1', { geometry: trail });

    const [saved] = save.mock.calls[0] ?? [];
    expect(saved?.distance).toBe(111.2);
  });

  it('rejects a geometry whose points are all the same', async () => {
    const degenerate: CoordinateTuple[] = [
      [1, 1],
      [1, 1],
    ];

    await expect(
      service.create('map-1', { geometry: degenerate }),
    ).rejects.toMatchObject({
      status: 400,
    });

    expect(create).not.toHaveBeenCalled();
  });

  it('throws 404 for an unknown path', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.remove('missing')).rejects.toMatchObject({
      status: 404,
    });

    expect(remove).not.toHaveBeenCalled();
  });

  it('returns the stored path with ISO timestamps', async () => {
    findOne.mockResolvedValue(makeRow());

    const result = await service.findOne('path-1');

    expect(result).toEqual({
      id: 'path-1',
      mapId: 'map-1',
      geometry: TWO_POINTS,
      distance: 111.2,
      name: null,
      createdAt: '2026-09-02T10:00:00.000Z',
      updatedAt: '2026-09-02T10:00:00.000Z',
    });
  });

  it('trims the name it stores', async () => {
    findOne.mockResolvedValue(makeRow());

    const result = await service.update('path-1', {
      name: '  Corredor central  ',
    });

    const [saved] = save.mock.calls[0] ?? [];
    expect(saved?.name).toBe('Corredor central');
    expect(result.name).toBe('Corredor central');
  });

  it('leaves the geometry and the distance alone when renaming', async () => {
    findOne.mockResolvedValue(makeRow({ name: 'Antigo' }));

    const result = await service.update('path-1', { name: 'Novo' });

    expect(result.geometry).toEqual(TWO_POINTS);
    expect(result.distance).toBe(111.2);
  });

  it('throws 404 when renaming an unknown path', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      service.update('missing', { name: 'Corredor central' }),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('does not save when the patch carries no name', async () => {
    // Corpo `{}` é um PATCH que não muda nada. Gravar assim marcaria
    // `updatedAt` sem qualquer alteração, e a tela mostraria o caminho como
    // editado quando ninguém editou.
    findOne.mockResolvedValue(makeRow({ name: 'Corredor central' }));

    const result = await service.update('path-1', {});

    expect(save).not.toHaveBeenCalled();
    expect(result.name).toBe('Corredor central');
  });

  it('replaces the geometry and recomputes the distance when adjusting', async () => {
    findOne.mockResolvedValue(
      makeRow({
        geometry: [
          [0, 0],
          [0.001, 0],
          [0.002, 0],
        ],
      }),
    );
    save.mockImplementation(async (entity) => entity as PathEntity);

    const adjusted: CoordinateTuple[] = [
      [0, 0],
      [0.0005, 0.0005],
      [0.002, 0],
    ];

    const result = await service.replaceGeometry('path-1', adjusted);

    expect(findOne).toHaveBeenCalledWith({ where: { id: 'path-1' } });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        geometry: adjusted,
        distance: expect.any(Number),
      }),
    );
    expect(result.geometry).toEqual(adjusted);
    expect(result.distance).toBeGreaterThan(222);
  });

  it('rejects adjustments that add or remove vertices', async () => {
    findOne.mockResolvedValue(makeRow());

    await expect(
      service.replaceGeometry('path-1', [
        [0, 0],
        [0.0005, 0],
        [0.001, 0],
      ]),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message: 'O ajuste não pode adicionar ou remover pontos do trajeto.',
      },
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('rejects an adjustment that collapses the trail to zero length', async () => {
    findOne.mockResolvedValue(makeRow());

    await expect(
      service.replaceGeometry('path-1', [
        [1, 1],
        [1, 1],
      ]),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message: 'O trajeto ajustado tem comprimento zero. Desfaça os ajustes.',
      },
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('throws 404 when adjusting an unknown path', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      service.replaceGeometry('missing', TWO_POINTS),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('deletes the path it just found', async () => {
    const row = makeRow();
    findOne.mockResolvedValue(row);

    await service.remove('path-1');

    expect(remove).toHaveBeenCalledWith(row);
  });
});
