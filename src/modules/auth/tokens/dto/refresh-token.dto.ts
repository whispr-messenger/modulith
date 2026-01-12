import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({
        description: 'Refresh token issued by the authentication server',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        type: String,
    })
    @IsNotEmpty()
    @IsString()
    refreshToken: string;
}