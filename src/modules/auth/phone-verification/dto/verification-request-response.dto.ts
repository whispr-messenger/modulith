import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for verification request response.
 * Contains the verification ID and optionally the code (in demo mode).
 */
export class VerificationRequestResponseDto {
	@ApiProperty({
		description: 'Unique identifier for the verification request',
		example: 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6a7b8',
	})
	verificationId: string;

	@ApiPropertyOptional({
		description: 'Verification code (only included in demo mode)',
		example: '123456',
	})
	code?: string;
}
