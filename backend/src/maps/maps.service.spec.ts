import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { EventEntity } from '../events/event.entity.js';
import { MapEntity } from './map.entity.js';
import { MapsService } from './maps.service.js';

type MapRow = {
  id: string;
  eventId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

function makeRow(overrides: Partial<MapRow> = {}): MapRow {
  return {
    id: 'map-1',
    eventId: 'event-1',
    name: 'Térreo',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('MapsService (unit)', () => {
  const create = vi.fn<Repository<MapEntity>['create']>();
  const save = vi.fn<(entity: MapEntity) => Promise<MapEntity>>();
  const find = vi.fn<() => Promise<MapEntity[]>>();
  const findOne = vi.fn<() => Promise<MapEntity | null>>();
  const exists = vi.fn<() => Promise<boolean>>();
  const remove = vi.fn<(entity: MapEntity) => Promise<MapEntity>>();
  const maps = {
    create,
    save,
    find,
    findOne,
    remove,
  } as unknown as Repository<MapEntity>;
  const events = { exists } as unknown as Repository<EventEntity>;

  let service: MapsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((entity) => entity as MapEntity);
    save.mockImplementation(async (entity) => makeRow(entity as MapRow));
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    exists.mockResolvedValue(true);
    remove.mockImplementation(async (entity) => entity);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MapsService,
        { provide: getRepositoryToken(MapEntity), useValue: maps },
        { provide: getRepositoryToken(EventEntity), useValue: events },
      ],
    }).compile();

    service = moduleRef.get(MapsService);
  });

  it('lists the maps of an event in creation order', async () => {
    find.mockResolvedValue([makeRow({ id: 'a' }), makeRow({ id: 'b' })]);

    const result = await service.findAllByEvent('event-1');

    expect(find).toHaveBeenCalledWith({
      where: { eventId: 'event-1' },
      order: { createdAt: 'ASC' },
    });
    expect(result.map((map) => map.id)).toEqual(['a', 'b']);
  });

  it('throws 404 when listing the maps of an unknown event', async () => {
    exists.mockResolvedValue(false);

    await expect(service.findAllByEvent('missing')).rejects.toMatchObject({
      status: 404,
    });

    expect(find).not.toHaveBeenCalled();
  });

  it('throws 404 when creating a map under an unknown event', async () => {
    exists.mockResolvedValue(false);

    await expect(
      service.create('missing', { name: 'Térreo' }),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(create).not.toHaveBeenCalled();
  });

  it('trims the name when creating a map', async () => {
    await service.create('event-1', { name: '  Térreo  ' });

    expect(create).toHaveBeenCalledWith({ eventId: 'event-1', name: 'Térreo' });
  });

  it('throws 404 when renaming an unknown map', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      service.update('missing', { name: 'Térreo' }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('renames a map and keeps the event it belongs to', async () => {
    findOne.mockResolvedValue(makeRow());

    const result = await service.update('map-1', { name: '  Primeiro andar ' });

    const [saved] = save.mock.calls[0] ?? [];
    expect(saved?.name).toBe('Primeiro andar');
    expect(saved?.eventId).toBe('event-1');
    expect(result.name).toBe('Primeiro andar');
  });

  it('keeps the stored name when the body has no name', async () => {
    findOne.mockResolvedValue(makeRow());

    await service.update('map-1', {});

    const [saved] = save.mock.calls[0] ?? [];
    expect(saved?.name).toBe('Térreo');
  });

  it('deletes the map it just found', async () => {
    findOne.mockResolvedValue(makeRow());

    await service.remove('map-1');

    const [deleted] = remove.mock.calls[0] ?? [];
    expect(deleted?.id).toBe('map-1');
  });

  it('throws 404 and deletes nothing when the map does not exist', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toMatchObject({
      status: 404,
    });

    expect(remove).not.toHaveBeenCalled();
  });
});
