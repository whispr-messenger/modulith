import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { Job } from './entities/job.entity';
import { Schedule } from './entities/schedule.entity';
import { JobExecution } from './entities/job-execution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Schedule, JobExecution]),
    // Bull Queues (Redis) - using BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'scheduler',
    }),
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule { }
