import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { cacheModuleOptionsFactory } from './config';

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


@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    CacheModule.registerAsync(cacheModuleAsyncOptions),
  ],
})
export class AppModule { }