import { Controller, Get, Query, Post, HttpCode, HttpStatus, DefaultValuePipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiOkResponse, } from '@nestjs/swagger';
import { UserSearchService } from './services/user-search.service';
import { UserSearchIndexService } from './services/user-search-index.service';
import { UserSearchResult, SearchOptions } from './types';
import { SEARCH_BY_PHONE_EXAMPLES, SEARCH_BY_USERNAME_EXAMPLES, USER_SEARCH_RESPONSE_SCHEMA, REBUILD_INDEXES_RESPONSE_SCHEMA, } from './swagger/user-search.examples';

@ApiTags('User - Search')
@Controller('user/search')
export class UserSearchController {
  constructor(
    private readonly userSearchService: UserSearchService,
    private readonly userSearchIndexService: UserSearchIndexService,
  ) { }

  @Get('phone')
  @ApiOperation({ summary: 'Search user by phone number', description: 'Search for a user by their phone number with optional viewer context and privacy checks', })
  @ApiQuery({ name: 'phoneNumber', description: 'Phone number to search for (international format recommended)', examples: SEARCH_BY_PHONE_EXAMPLES })
  @ApiQuery({ name: 'viewerId', description: 'ID of the user performing the search (for privacy checks)', required: false, })
  @ApiQuery({ name: 'includeInactive', description: 'Include inactive users in search results', required: false, type: Boolean, })
  @ApiOkResponse({ description: 'User found', schema: USER_SEARCH_RESPONSE_SCHEMA })
  @ApiResponse({ status: 404, description: 'User not found' })
  async searchByPhoneNumber(@Query('phoneNumber') phoneNumber: string, @Query('viewerId') viewerId?: string, @Query('includeInactive', new DefaultValuePipe(false)) includeInactive?: boolean,): Promise<UserSearchResult | null> {
    const options: SearchOptions = { viewerId, includeInactive };

    return await this.userSearchService.searchByPhoneNumber(phoneNumber, options);
  }

  @Get('username')
  @ApiOperation({ summary: 'Search user by username', description: 'Search for a user by their username with optional viewer context and privacy checks', })
  @ApiQuery({ name: 'username', description: 'Username to search for', examples: SEARCH_BY_USERNAME_EXAMPLES, })
  @ApiQuery({ name: 'viewerId', description: 'ID of the user performing the search (for privacy checks)', required: false, })
  @ApiQuery({ name: 'includeInactive', description: 'Include inactive users in search results', required: false, type: Boolean, })
  @ApiOkResponse({ description: 'User found', schema: USER_SEARCH_RESPONSE_SCHEMA, })
  @ApiResponse({ status: 404, description: 'User not found' })
  async searchByUsername(@Query('username') username: string, @Query('viewerId') viewerId?: string, @Query('includeInactive', new DefaultValuePipe(false)) includeInactive?: boolean,): Promise<UserSearchResult | null> {
    const options: SearchOptions = { viewerId, includeInactive, };

    return await this.userSearchService.searchByUsername(username, options);
  }

  @Post('rebuild-indexes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rebuild search indexes', description: 'Rebuilds all search indexes. This operation may take some time for large datasets.', })
  @ApiResponse({ status: 200, description: 'Search indexes rebuilt successfully', schema: REBUILD_INDEXES_RESPONSE_SCHEMA, })
  @ApiResponse({ status: 500, description: 'Failed to rebuild search indexes' })
  async rebuildSearchIndexes(): Promise<{ message: string }> {
    await this.userSearchIndexService.rebuildSearchIndexes();
    return { message: 'Search indexes rebuilt successfully' };
  }
}
