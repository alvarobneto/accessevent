import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MapEntity } from '../maps/map.entity.js';
import { PathEntity } from './path.entity.js';
import { MapPathsController, PathsController } from './paths.controller.js';
import { PathsService } from './paths.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PathEntity, MapEntity])],
  controllers: [MapPathsController, PathsController],
  providers: [PathsService],
})
export class PathsModule {}
