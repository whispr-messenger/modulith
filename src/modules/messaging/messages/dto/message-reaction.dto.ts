import { ApiProperty } from '@nestjs/swagger';

export class MessageReactionDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    messageId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty({ maxLength: 50 })
    reaction: string;

    @ApiProperty()
    createdAt: Date;
}
