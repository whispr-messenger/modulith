import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSearchService } from './user-search.service';
import { UserSearchController } from './user-search.controller';
import { User, PrivacySettings, UserSearchIndex } from '../entities';
import { CacheModule } from '../cache/cache.module';
import { PrivacyModule } from '../privacy/privacy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PrivacySettings, UserSearchIndex]),
    CacheModule,
    PrivacyModule,
  ],
  controllers: [UserSearchController],
  providers: [UserSearchService],
  exports: [UserSearchService],
})
export class UserSearchModule { }
