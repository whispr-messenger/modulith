import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for rotation recommendations
 */
export class RotationRecommendationsDto {
	@ApiProperty({
		description: 'Whether the user needs to replenish prekeys',
		example: false,
	})
	needsPreKeyReplenishment: boolean;

	@ApiProperty({
		description: 'Whether the signed prekey needs rotation',
		example: false,
	})
	needsSignedPreKeyRotation: boolean;

	@ApiProperty({
		description: 'Number of available prekeys',
		example: 87,
	})
	availablePreKeys: number;

	@ApiProperty({
		description: 'Recommended number of prekeys to upload',
		example: 0,
	})
	recommendedPreKeyUpload: number;

	@ApiProperty({
		description: 'When the current signed prekey expires',
		example: '2026-01-15T10:30:00Z',
		required: false,
	})
	signedPreKeyExpiresAt?: Date;
}
