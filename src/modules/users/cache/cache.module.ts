import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { SearchIndexService } from './search-index.service';

@Global()
@Module({
  providers: [CacheService, SearchIndexService],
  exports: [CacheService, SearchIndexService],
})
export class CacheModule {}
