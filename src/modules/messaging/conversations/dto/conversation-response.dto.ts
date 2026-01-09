import { ApiProperty } from '@nestjs/swagger';
import { ConversationType } from '../../entities';
import { ConversationMemberDto } from './conversation-member.dto';

export class ConversationResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: ConversationType })
    type: ConversationType;

    @ApiProperty({ required: false, nullable: true })
    externalGroupId: string | null;

    @ApiProperty({ type: 'object', additionalProperties: true })
    metadata: Record<string, any>;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: [ConversationMemberDto] })
    members: ConversationMemberDto[];

    @ApiProperty({ required: false })
    unreadCount?: number;
}
