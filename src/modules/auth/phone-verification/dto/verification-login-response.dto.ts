import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for login verification confirmation response.
 */
export class VerificationLoginResponseDto {
	@ApiProperty({
		description: 'Indicates if the verification was successful',
		example: true,
	})
	verified: boolean;

	@ApiProperty({
		description: 'Indicates if two-factor authentication is required',
		example: false,
	})
	requires2FA: boolean;
}
