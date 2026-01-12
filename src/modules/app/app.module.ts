import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { cacheModuleOptionsFactory, typeOrmModuleOptionsFactory } from './config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Core modules
import { HealthModule } from '../heatlh/health.module';
import { AuthModule } from '../auth/auth.module';
import { LifecycleService } from './services/lifecycle.service';
import { MessagingModule } from '../messaging/messaging.module';
import { UsersModule } from '../users/users.module';

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
    // Task Scheduling (Cron)
    ScheduleModule.forRoot(),
    // Feature modules
    HealthModule,
    AuthModule,
    MessagingModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [LifecycleService],
})
export class AppModule { }