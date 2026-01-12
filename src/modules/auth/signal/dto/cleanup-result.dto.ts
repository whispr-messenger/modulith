import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for manual cleanup operation
 */
export class CleanupResultDto {
	@ApiProperty({
		description: 'Confirmation message',
		example: 'Cleanup completed successfully',
	})
	message: string;

	@ApiProperty({
		description: 'Number of expired keys that were deleted',
		example: 5,
	})
	expiredKeysDeleted: number;

	@ApiProperty({
		description: 'Number of old prekeys that were deleted',
		example: 23,
	})
	oldPreKeysDeleted: number;
}
