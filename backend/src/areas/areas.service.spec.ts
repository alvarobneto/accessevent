import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { MapEntity } from '../maps/map.entity.js';

import type { AreaEntity } from './area.entity.js';
import { AreaEntity as AreaEntityClass } from './area.entity.js';
import { AreasService } from './areas.service.js';

const GEOMETRY: AreaEntity['geometry'] = [
  [-23.55, -46.63],
  [-23.55, -46.62],
  [-23.56, -46.62],
];

function savedArea(overrides: Partial<AreaEntity> = {}): AreaEntity {
  return Object.assign(new AreaEntityClass(), {
    id: 'area-1',
    mapId: 'map-1',
    name: 'Praça de alimentação',
    type: 'alimentacao',
    geometry: GEOMETRY,
    description: null,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    ...overrides,
  });
}

describe('AreasService', () => {
  const create = vi.fn<Repository<AreaEntity>['create']>();
  const save = vi.fn<(entity: AreaEntity) => Promise<AreaEntity>>();
  const find = vi.fn<Repository<AreaEntity>['find']>();
  const findOne = vi.fn<Repository<AreaEntity>['findOne']>();
  const remove = vi.fn<Repository<AreaEntity>['remove']>();
  const areas = { create, save, find, findOne, remove } as unknown as Repository<AreaEntity>;
  const exists = vi.fn<Repository<MapEntity>['exists']>();
  const maps = { exists } as unknown as Repository<MapEntity>;
  let service: AreasService;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((entity) => entity as AreaEntity);
    save.mockImplementation(async (entity) => savedArea(entity as Partial<AreaEntity>));
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(savedArea());
    remove.mockImplementation(async (entity) => entity);
    exists.mockResolvedValue(true);

    const module = await Test.createTestingModule({
      providers: [
        AreasService,
        { provide: getRepositoryToken(AreaEntityClass), useValue: areas },
        { provide: getRepositoryToken(MapEntity), useValue: maps },
      ],
    }).compile();
    service = module.get(AreasService);
  });

  it('lists areas by map in creation order', async () => {
    find.mockResolvedValue([savedArea()]);
    await service.findAllByMap('map-1');
    expect(find).toHaveBeenCalledWith({ where: { mapId: 'map-1' }, order: { createdAt: 'ASC' } });
  });

  it('trims names and descriptions when creating an area', async () => {
    await service.create('map-1', {
      name: '  Salão principal  ',
      type: 'salao',
      geometry: GEOMETRY,
      description: '  Espaço central  ',
    });
    expect(create).toHaveBeenCalledWith({
      mapId: 'map-1',
      name: 'Salão principal',
      type: 'salao',
      geometry: GEOMETRY,
      description: 'Espaço central',
    });
  });

  it('returns 404 for a map that does not exist', async () => {
    exists.mockResolvedValue(false);
    await expect(service.findAllByMap('missing')).rejects.toMatchObject({ status: 404 });
    await expect(
      service.create('missing', { name: 'Salão', type: 'salao', geometry: GEOMETRY }),
    ).rejects.toMatchObject({ status: 404 });
    expect(find).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('does not save an empty patch and reports a missing area', async () => {
    await service.update('area-1', {});
    expect(save).not.toHaveBeenCalled();
    findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toMatchObject({ status: 404 });
    await expect(service.remove('missing')).rejects.toMatchObject({ status: 404 });
    expect(remove).not.toHaveBeenCalled();
  });

  it('updates area geometry and metadata', async () => {
    findOne.mockResolvedValue(savedArea());
    await service.update('area-1', { name: 'Área leste', type: 'exposicao', geometry: GEOMETRY });
    expect(save).toHaveBeenCalledOnce();
    const updated = save.mock.calls[0]?.[0];
    expect(updated).toMatchObject({ name: 'Área leste', type: 'exposicao', geometry: GEOMETRY });
  });
});
