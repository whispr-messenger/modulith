import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for searching conversations
 */
export class SearchConversationsDto {
  @ApiPropertyOptional({
    description: 'Search query string for conversation name or content',
    example: 'project discussion',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by conversation type',
    enum: ['direct', 'group'],
    example: 'group',
  })
  @IsOptional()
  @IsIn(['direct', 'group'])
  type?: 'direct' | 'group';

  @ApiPropertyOptional({
    description: 'Include archived conversations in search results',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean = false;

  @ApiPropertyOptional({
    description: 'Only show pinned conversations',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyPinned?: boolean = false;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort order for results',
    enum: ['recent', 'name', 'unread'],
    default: 'recent',
    example: 'recent',
  })
  @IsOptional()
  @IsIn(['recent', 'name', 'unread'])
  sortBy?: 'recent' | 'name' | 'unread' = 'recent';
}
