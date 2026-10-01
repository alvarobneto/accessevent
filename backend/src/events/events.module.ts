import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventEntity } from './event.entity.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
