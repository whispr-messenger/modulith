import { ApiProperty } from '@nestjs/swagger';
import { ConversationResponseDto } from './conversation-response.dto';

export class ConversationListResponseDto {
    @ApiProperty({ type: [ConversationResponseDto] })
    data: ConversationResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    offset: number;
}
