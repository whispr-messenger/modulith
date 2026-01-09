import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for signed prekey upload
 */
export class SignedPreKeyUploadResponseDto {
    @ApiProperty({
        description: 'Confirmation message',
        example: 'Signed prekey uploaded successfully',
    })
    message: string;
}

/**
 * Response DTO for prekeys upload
 */
export class PreKeysUploadResponseDto {
    @ApiProperty({ description: 'Confirmation message', example: 'PreKeys uploaded successfully' })
    message: string;

    @ApiProperty({ description: 'Number of prekeys that were uploaded', example: 50 })
    uploaded: number;
}
