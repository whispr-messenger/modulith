import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto {
    @ApiProperty()
    success: boolean;

    @ApiProperty({ required: false })
    message?: string;
}
