import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for verification confirmation response.
 */
export class VerificationConfirmResponseDto {
	@ApiProperty({
		description: 'Indicates if the verification was successful',
		example: true,
	})
	verified: boolean;
}
