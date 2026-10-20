import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MapEntity } from '../maps/map.entity.js';

import { AreaEntity } from './area.entity.js';
import { AreasController } from './areas.controller.js';
import { AreasService } from './areas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AreaEntity, MapEntity])],
  controllers: [AreasController],
  providers: [AreasService],
})
export class AreasModule {}
