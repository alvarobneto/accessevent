import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MapEntity } from '../maps/map.entity.js';

import { PoiEntity } from './poi.entity.js';
import { PoisController } from './pois.controller.js';
import { PoisService } from './pois.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PoiEntity, MapEntity])],
  controllers: [PoisController],
  providers: [PoisService],
  exports: [PoisService],
})
export class PoisModule {}
