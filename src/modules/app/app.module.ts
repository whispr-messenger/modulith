import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { cacheModuleOptionsFactory, typeOrmModuleOptionsFactory } from './config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

// Core modules
import { HealthModule } from '../heatlh/health.module';
import { AuthModule } from '../auth/auth.module';

// Scheduling modules
import { SchedulerModule } from '../scheduler/scheduler.module';
import { QueueModule } from '../queues/queue.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

// Messaging module
import { MessagingModule } from '../messaging/messaging.module';

// Environment variables
const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  envFilePath: '.env',
};

// Caching (Redis)
const cacheModuleAsyncOptions: CacheModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: cacheModuleOptionsFactory,
  inject: [ConfigService],
  isGlobal: true,
};

// Database (Postgres)
const typeOrmModuleAsyncOptions: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: typeOrmModuleOptionsFactory,
  inject: [ConfigService],
};

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot(configModuleOptions),

    // Caching (Redis)
    CacheModule.registerAsync(cacheModuleAsyncOptions),

    // Database (Postgres)
    TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),

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

    // Task Scheduling (Cron)
    ScheduleModule.forRoot(),

    // Core modules
    HealthModule,
    // AuthModule,

    // Scheduling modules
    SchedulerModule,
    QueueModule,
    MonitoringModule,

    // Messaging module
    MessagingModule,
  ],
  controllers: [AppController],
})
export class AppModule { }