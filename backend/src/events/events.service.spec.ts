import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { EventEntity } from './event.entity.js';
import { EventsService } from './events.service.js';

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

function makeRow(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 'event-1',
    name: 'Feira de Tecnologia Acessível',
    description: null,
    address: null,
    startDate: null,
    endDate: null,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('EventsService (unit)', () => {
  const create = vi.fn<Repository<EventEntity>['create']>();
  const save = vi.fn<(entity: EventEntity) => Promise<EventEntity>>();
  const find = vi.fn<() => Promise<EventEntity[]>>();
  const findOne = vi.fn<() => Promise<EventEntity | null>>();
  const remove = vi.fn<(entity: EventEntity) => Promise<EventEntity>>();
  const events = {
    create,
    save,
    find,
    findOne,
    remove,
  } as unknown as Repository<EventEntity>;

  let service: EventsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((entity) => entity as EventEntity);
    save.mockImplementation(async (entity) => makeRow(entity as EventRow));
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    remove.mockImplementation(async (entity) => entity);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(EventEntity), useValue: events },
      ],
    }).compile();

    service = moduleRef.get(EventsService);
  });

  it('lists events ordered by name', async () => {
    find.mockResolvedValue([
      makeRow({ id: 'b', name: 'B Congresso' }),
      makeRow({ id: 'a', name: 'A Feira' }),
    ]);

    const result = await service.findAll();

    expect(find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    expect(result.map((event) => event.id)).toEqual(['b', 'a']);
  });

  it('exposes dates as YYYY-MM-DD and timestamps as ISO strings', async () => {
    findOne.mockResolvedValue(
      makeRow({ startDate: '2026-10-05', endDate: '2026-10-08' }),
    );

    const result = await service.findOne('event-1');

    expect(result).toEqual({
      id: 'event-1',
      name: 'Feira de Tecnologia Acessível',
      description: null,
      address: null,
      startDate: '2026-10-05',
      endDate: '2026-10-08',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });
  });

  it('throws 404 when the event does not exist', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('trims the name and stores empty optional texts as null on create', async () => {
    await service.create({
      name: '  Feira  ',
      description: '   ',
      address: '',
    });

    expect(create).toHaveBeenCalledWith({
      name: 'Feira',
      description: null,
      address: null,
      startDate: null,
      endDate: null,
    });
  });

  it('rejects a create whose end date precedes the start date', async () => {
    await expect(
      service.create({
        name: 'Feira',
        startDate: '2026-10-08',
        endDate: '2026-10-05',
      }),
    ).rejects.toMatchObject({ status: 400 });

    expect(create).not.toHaveBeenCalled();
  });

  it('leaves untouched fields alone on update', async () => {
    findOne.mockResolvedValue(
      makeRow({ description: 'Pavilhões A e B', address: 'São Paulo, SP' }),
    );

    await service.update('event-1', { name: 'Novo nome' });

    const [saved] = save.mock.calls[0] ?? [];
    expect(saved).toMatchObject({ name: 'Novo nome' });
    expect(saved?.description).toBe('Pavilhões A e B');
    expect(saved?.address).toBe('São Paulo, SP');
  });

  it('clears an optional field when the body sends an empty string', async () => {
    findOne.mockResolvedValue(makeRow({ address: 'São Paulo, SP' }));

    await service.update('event-1', { address: '   ' });

    const [saved] = save.mock.calls[0] ?? [];
    expect(saved?.address).toBeNull();
  });

  it('validates the date range against the stored value when only one date is sent', async () => {
    findOne.mockResolvedValue(makeRow({ startDate: '2026-10-05' }));

    await expect(
      service.update('event-1', { endDate: '2026-10-01' }),
    ).rejects.toMatchObject({
      status: 400,
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('deletes the event it just found', async () => {
    findOne.mockResolvedValue(makeRow());

    await service.remove('event-1');

    const [deleted] = remove.mock.calls[0] ?? [];
    expect(deleted?.id).toBe('event-1');
  });

  it('throws 404 and deletes nothing when the event does not exist', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toMatchObject({
      status: 404,
    });

    expect(remove).not.toHaveBeenCalled();
  });
});
