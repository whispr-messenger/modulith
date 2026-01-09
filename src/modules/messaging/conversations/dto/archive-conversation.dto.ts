import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for archiving a conversation
 */
export class ArchiveConversationDto {
  @ApiProperty({
    description: 'ID of the conversation to archive',
    example: 'a7f4e23b-8d45-4e7c-9f12-a3d4e5f67890',
  })
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;
}
