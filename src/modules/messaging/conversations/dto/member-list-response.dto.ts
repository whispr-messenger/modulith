import { ApiProperty } from '@nestjs/swagger';
import { ConversationMemberDto } from './conversation-member.dto';

export class MemberListResponseDto {
    @ApiProperty({ type: [ConversationMemberDto] })
    data: ConversationMemberDto[];

    @ApiProperty()
    conversationId: string;
}
