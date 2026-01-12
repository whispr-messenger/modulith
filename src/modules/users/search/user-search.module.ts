import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSearchService } from './services/user-search.service';
import { UserSearchIndexService } from './services/user-search-index.service';
import { UserSearchRepository } from './user-search.repository';
import { UserSearchController } from './user-search.controller';
import { User } from '../common/entities/user.entity';
import { PrivacySettings } from '../privacy/privacy-settings.entity';
import { UserSearchIndex } from './entities/user-search-index.entity';
import { CacheModule } from '../cache/cache.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { UserRepository } from '../common/repositories/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PrivacySettings, UserSearchIndex]),
    CacheModule,
    PrivacyModule,
  ],
  controllers: [UserSearchController],
  providers: [UserSearchService, UserSearchIndexService, UserSearchRepository, UserRepository],
  exports: [UserSearchService, UserSearchIndexService],
})
export class UserSearchModule { }
