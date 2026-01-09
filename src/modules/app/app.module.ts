import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { LifecycleService } from './services/lifecycle.service';

// Scheduling modules
import { SchedulerModule } from '../scheduling/scheduler.module';
import { QueueModule } from '../queues/queue.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

// Messaging module
import { MessagingModule } from '../messaging/messaging.module';

// User service modules
import { UsersModule } from '../users/users.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { ContactsModule } from '../contacts/contacts.module';
import { BlockedUsersModule } from '../blocked-users/blocked-users.module';
import { UserSearchModule } from '../search/user-search.module';
import { GroupsModule } from '../groups/groups.module';

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
    
    // Event Emitter
    EventEmitterModule.forRoot(),

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
    AuthModule,
    
    // Messaging module
    MessagingModule,
    
    // User service modules
    UsersModule,
    PrivacyModule,
    ContactsModule,
    BlockedUsersModule,
    UserSearchModule,
    GroupsModule,
>>>>>>> 407d2985fdaa072b5afb94be959d22cf7212632a
  ],
  controllers: [AppController],
  providers: [LifecycleService],
})
export class AppModule { }