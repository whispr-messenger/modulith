import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { cacheModuleOptionsFactory, typeOrmModuleOptionsFactory } from './config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { HealthModule } from '../heatlh/health.module';
import { AuthModule } from '../auth/auth.module';

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
    ConfigModule.forRoot(configModuleOptions),
    CacheModule.registerAsync(cacheModuleAsyncOptions),
    TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
    HealthModule,
    AuthModule,
  ],
})
export class AppModule { }