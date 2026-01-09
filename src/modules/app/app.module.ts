import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { cacheModuleOptionsFactory, typeOrmModuleOptionsFactory } from './config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { HealthModule } from '../heatlh/health.module';
// import { AuthModule } from '../auth/auth.module';

// Import all user-service modules
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
    ConfigModule.forRoot(configModuleOptions),
    CacheModule.registerAsync(cacheModuleAsyncOptions),
    TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
    EventEmitterModule.forRoot(),
    HealthModule,
    // AuthModule,
    // User service modules
    UsersModule,
    PrivacyModule,
    ContactsModule,
    BlockedUsersModule,
    UserSearchModule,
    GroupsModule,
  ],
})
export class AppModule { }