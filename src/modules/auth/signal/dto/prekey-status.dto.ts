import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for PreKey status
 * Used to monitor and alert when prekeys are running low
 */
export class PreKeyStatusDto {
	@ApiProperty({
		description: 'User ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	userId: string;

	@ApiProperty({
		description: 'Number of unused prekeys available',
		example: 87,
	})
	availablePreKeys: number;

	@ApiProperty({
		description: 'Whether the prekey count is below the recommended threshold (< 20)',
		example: false,
	})
	isLow: boolean;

	@ApiProperty({
		description: 'Whether the user has an active (non-expired) signed prekey',
		example: true,
	})
	hasActiveSignedPreKey: boolean;

	@ApiProperty({
		description: 'Total number of prekeys (used + unused)',
		example: 100,
	})
	totalPreKeys: number;

	@ApiProperty({
		description: 'Recommended number of prekeys to upload',
		example: 0,
	})
	recommendedUpload: number;
}
