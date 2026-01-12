import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMemberSettingsDto {
    @ApiProperty({ 
        required: false, 
        description: 'Whether the conversation is muted for this user'
    })
    @IsBoolean()
    @IsOptional()
    muted?: boolean;

    @ApiProperty({ 
        required: false, 
        description: 'Whether notifications are enabled for this conversation'
    })
    @IsBoolean()
    @IsOptional()
    notifications?: boolean;
}
