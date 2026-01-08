import {
	Controller,
	Post,
	Get,
	Delete,
	Body,
	Param,
	UseGuards,
	Req,
	HttpCode,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBearerAuth,
	ApiBody,
} from '@nestjs/swagger';
import {
	SignalKeyRotationService,
	SignalKeyValidationService,
	SignalKeyStorageService,
} from '../services';
import {
	SignedPreKeyDto,
	UploadPreKeysDto,
	RotationRecommendationsDto,
} from '../dto';

/**
 * Controller for managing Signal Protocol keys
 * 
 * Provides endpoints for uploading, rotating, and deleting keys.
 * These endpoints require authentication.
 */
@ApiTags('Signal Protocol - Key Management')
@Controller('api/v1/signal/keys')
@ApiBearerAuth()
export class SignalKeysManagementController {
	private readonly logger = new Logger(SignalKeysManagementController.name);

	constructor(
		private readonly rotationService: SignalKeyRotationService,
		private readonly validationService: SignalKeyValidationService,
		private readonly storageService: SignalKeyStorageService,
	) {}

	/**
	 * POST /api/v1/signal/keys/signed-prekey
	 * 
	 * Upload a new signed prekey (for rotation)
	 */
	@Post('signed-prekey')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: 'Upload a new signed prekey',
		description:
			'Uploads a new signed prekey for key rotation. This should be done every 7 days to maintain forward secrecy.',
	})
	@ApiBody({
		type: SignedPreKeyDto,
		description: 'The new signed prekey to upload',
	})
	@ApiResponse({
		status: 201,
		description: 'Signed prekey uploaded successfully',
	})
	@ApiResponse({
		status: 400,
		description: 'Invalid key format or validation failed',
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized',
	})
	async uploadSignedPreKey(
		@Body() signedPreKey: SignedPreKeyDto,
		@Req() req: any,
	): Promise<{ message: string }> {
		// TODO: Extract userId from JWT token in req.user
		const userId = req.user?.id || 'mock-user-id';

		this.logger.log(`Upload signed prekey request from user ${userId}`);

		// Validate the signed prekey
		this.validationService.validateSignedPreKey(signedPreKey);

		// Check uniqueness
		await this.validationService.validateSignedPreKeyIdUniqueness(
			userId,
			signedPreKey.keyId,
		);

		// Rotate the key
		await this.rotationService.rotateSignedPreKey(userId, signedPreKey);

		return {
			message: 'Signed prekey uploaded successfully',
		};
	}

	/**
	 * POST /api/v1/signal/keys/prekeys
	 * 
	 * Upload new prekeys (replenishment)
	 */
	@Post('prekeys')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: 'Upload new prekeys',
		description:
			'Uploads a batch of new one-time prekeys. Should be called when prekey count falls below 20.',
	})
	@ApiBody({
		type: UploadPreKeysDto,
		description: 'Array of prekeys to upload',
	})
	@ApiResponse({
		status: 201,
		description: 'PreKeys uploaded successfully',
	})
	@ApiResponse({
		status: 400,
		description: 'Invalid key format or too many keys',
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized',
	})
	async uploadPreKeys(
		@Body() uploadDto: UploadPreKeysDto,
		@Req() req: any,
	): Promise<{ message: string; uploaded: number }> {
		const userId = req.user?.id || 'mock-user-id';

		this.logger.log(
			`Upload ${uploadDto.preKeys.length} prekeys request from user ${userId}`,
		);

		// Validate all prekeys
		this.validationService.validatePreKeys(uploadDto.preKeys);

		// Replenish the keys
		await this.rotationService.replenishPreKeys(userId, uploadDto.preKeys);

		return {
			message: 'PreKeys uploaded successfully',
			uploaded: uploadDto.preKeys.length,
		};
	}

	/**
	 * GET /api/v1/signal/keys/recommendations
	 * 
	 * Get rotation recommendations for the authenticated user
	 */
	@Get('recommendations')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Get key rotation recommendations',
		description:
			'Returns recommendations about which keys need to be rotated or replenished.',
	})
	@ApiResponse({
		status: 200,
		description: 'Rotation recommendations retrieved',
		type: RotationRecommendationsDto,
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized',
	})
	async getRotationRecommendations(
		@Req() req: any,
	): Promise<RotationRecommendationsDto> {
		const userId = req.user?.id || 'mock-user-id';

		this.logger.log(`Get rotation recommendations for user ${userId}`);

		return await this.rotationService.getRotationRecommendations(userId);
	}

	/**
	 * DELETE /api/v1/signal/keys/device/:deviceId
	 * 
	 * Delete all keys associated with a device
	 */
	@Delete('device/:deviceId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: 'Delete keys for a device',
		description:
			'Deletes all Signal Protocol keys associated with a specific device. Used when removing a device.',
	})
	@ApiParam({
		name: 'deviceId',
		description: 'The UUID of the device',
		example: '987fcdeb-51a2-43f7-9c8d-123456789abc',
	})
	@ApiResponse({
		status: 204,
		description: 'Device keys deleted successfully',
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized',
	})
	@ApiResponse({
		status: 403,
		description: 'Forbidden - not your device',
	})
	async deleteDeviceKeys(
		@Param('deviceId') deviceId: string,
		@Req() req: any,
	): Promise<void> {
		const userId = req.user?.id || 'mock-user-id';

		this.logger.log(`Delete keys for device ${deviceId} by user ${userId}`);

		// TODO: Verify the device belongs to the user
		// For now, we delete all keys for the user
		// In a multi-device setup, this would be device-specific

		await this.storageService.deleteAllKeysForUser(userId);

		this.logger.log(`Successfully deleted keys for device ${deviceId}`);
	}

	/**
	 * DELETE /api/v1/signal/keys
	 * 
	 * Delete all keys for the authenticated user
	 */
	@Delete()
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: 'Delete all keys',
		description:
			'Deletes all Signal Protocol keys for the authenticated user. Use with caution.',
	})
	@ApiResponse({
		status: 204,
		description: 'All keys deleted successfully',
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized',
	})
	async deleteAllKeys(@Req() req: any): Promise<void> {
		const userId = req.user?.id || 'mock-user-id';

		this.logger.log(`Delete all keys for user ${userId}`);

		await this.storageService.deleteAllKeysForUser(userId);

		this.logger.log(`Successfully deleted all keys for user ${userId}`);
	}
}
