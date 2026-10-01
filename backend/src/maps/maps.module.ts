import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventEntity } from '../events/event.entity.js';
import { MapEntity } from './map.entity.js';
import { EventMapsController, MapsController } from './maps.controller.js';
import { MapsService } from './maps.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MapEntity, EventEntity])],
  controllers: [EventMapsController, MapsController],
  providers: [MapsService],
})
export class MapsModule {}
