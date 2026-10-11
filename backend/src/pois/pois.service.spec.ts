import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MapEntity } from '../maps/map.entity.js';
import { PoiEntity } from './poi.entity.js';
import { PoisService } from './pois.service.js';

/**
 * Retângulo de teste com 2 m de lado, para a âncora do meio cair em um ponto
 * redondo e a posição derivada ficar fácil de ler.
 */
const RECT = {
  northEast: [0.00001, 0.00001] as [number, number],
  southWest: [-0.00001, -0.00001] as [number, number],
};

const CENTER = { u: 0.5, v: 0.5 };

/**
 * Entidade salva, com as datas que `toPoiResponse` sempre lê.
 *
 * Existe para os testes não repetirem o objeto inteiro, e para nenhum deles
 * precisar mentir para o `save` devolvendo um `Partial`: o service lê `createdAt` do que o
 * `save` devolve, então devolver menos que a entidade quebra o teste por um motivo
 * que não é o que ele está verificando.
 */
function savedPoi(overrides: Partial<PoiEntity>): PoiEntity {
  return Object.assign(new PoiEntity(), {
    id: 'poi1',
    mapId: 'm1',
    rect: RECT,
    anchor: CENTER,
    description: null,
    accessibilityInfo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('PoisService', () => {
  let service: PoisService;
  let poisRepo: Repository<PoiEntity>;
  let mapsRepo: Repository<MapEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoisService,
        {
          provide: getRepositoryToken(PoiEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(MapEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<PoisService>(PoisService);
    poisRepo = module.get<Repository<PoiEntity>>(getRepositoryToken(PoiEntity));
    mapsRepo = module.get<Repository<MapEntity>>(getRepositoryToken(MapEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates poi for existing map', async () => {
    mapsRepo.exists = vi.fn().mockResolvedValue(true);
    poisRepo.create = vi.fn().mockReturnValue({ id: 'poi1' });
    poisRepo.save = vi.fn().mockResolvedValue({
      id: 'poi1',
      mapId: 'm1',
      name: 'Entrada',
      type: 'Entrada',
      rect: RECT,
      anchor: CENTER,
      description: null,
      accessibilityInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await service.create('m1', {
      name: 'Entrada',
      type: 'Entrada',
      rect: RECT,
      anchor: CENTER,
    });

    expect(res.id).toBe('poi1');
  });

  /**
   * `name` é opcional no DTO e obrigatório na coluna, então o service normaliza.
   * Sem o `|| dto.type` o `create` gravaria `undefined` e o Postgres recusaria a
   * inserção com violação de `NOT NULL` — erro de banco em quem só esqueceu de
   * nomear o ponto.
   */
  it('grava o tipo como nome quando o ponto não foi nomeado', async () => {
    mapsRepo.exists = vi.fn().mockResolvedValue(true);
    const create = vi.fn().mockReturnValue({ id: 'poi1' });
    poisRepo.create = create;
    poisRepo.save = vi
      .fn()
      .mockResolvedValue(savedPoi({ name: 'Elevador', type: 'Elevador' }));

    await service.create('m1', { type: 'Elevador', rect: RECT, anchor: CENTER });

    const created = create.mock.calls[0]?.[0];
    expect(created?.name).toBe('Elevador');
  });

  it('apara o nome que foi informado, em vez de usar o tipo como fallback', async () => {
    mapsRepo.exists = vi.fn().mockResolvedValue(true);
    const create = vi.fn().mockReturnValue({ id: 'poi1' });
    poisRepo.create = create;
    poisRepo.save = vi
      .fn()
      .mockResolvedValue(savedPoi({ name: 'Portão B', type: 'Entrada' }));

    await service.create('m1', {
      name: '  Portão B  ',
      type: 'Entrada',
      rect: RECT,
      anchor: CENTER,
    });

    const created = create.mock.calls[0]?.[0];
    expect(created?.name).toBe('Portão B');
  });
});
