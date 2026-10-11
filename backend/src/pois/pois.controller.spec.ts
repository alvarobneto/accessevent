import { Test, TestingModule } from '@nestjs/testing';
import { PoisController } from './pois.controller.js';
import { PoisService } from './pois.service.js';

describe('PoisController', () => {
  let controller: PoisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoisController],
      providers: [
        {
          provide: PoisService,
          useValue: {
            findAllByMap: vi.fn(),
            findOne: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PoisController>(PoisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
