import { ApiProperty } from '@nestjs/swagger';

export class ConversationMemberSettingsDto {
    @ApiProperty({ enum: ['admin', 'member'], required: false })
    role?: 'admin' | 'member';

    @ApiProperty({ required: false })
    notifications?: boolean;

    @ApiProperty({ required: false })
    muted?: boolean;

    @ApiProperty({ required: false })
    nickname?: string;
}
