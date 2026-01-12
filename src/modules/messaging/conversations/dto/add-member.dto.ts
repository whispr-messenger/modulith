import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional } from 'class-validator';

export class AddMemberDto {
    @ApiProperty({ description: 'User ID to add to the conversation' })
    @IsUUID()
    userId: string;

    @ApiProperty({ 
        enum: ['admin', 'member'], 
        required: false, 
        description: 'Role of the member in the conversation',
        default: 'member'
    })
    @IsEnum(['admin', 'member'])
    @IsOptional()
    role?: 'admin' | 'member';
}
