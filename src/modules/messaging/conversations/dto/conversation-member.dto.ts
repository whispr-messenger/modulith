import { ApiProperty } from '@nestjs/swagger';
import { ConversationMemberSettingsDto } from './conversation-member-settings.dto';

export class ConversationMemberDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    conversationId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty({ type: ConversationMemberSettingsDto })
    settings: ConversationMemberSettingsDto;

    @ApiProperty({ required: false, nullable: true })
    lastReadAt: Date | null;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
