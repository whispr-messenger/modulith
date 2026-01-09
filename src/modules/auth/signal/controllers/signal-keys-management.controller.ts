import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus, Logger, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../tokens/guards';
import { SignalKeyRotationService, SignalKeyValidationService, SignalKeyStorageService, } from '../services';
import { DevicesService } from '../../devices/services';
import { SignedPreKeyDto, UploadPreKeysDto, RotationRecommendationsDto, SignedPreKeyUploadResponseDto, PreKeysUploadResponseDto, } from '../dto';
import {
	SIGNED_PREKEY_UPLOAD_RESPONSE_SCHEMA,
	SIGNED_PREKEY_UPLOAD_EXAMPLES,
	SIGNED_PREKEY_UPLOAD_RESPONSE_EXAMPLES,
	PREKEYS_UPLOAD_RESPONSE_SCHEMA,
	PREKEYS_UPLOAD_EXAMPLES,
	PREKEYS_UPLOAD_RESPONSE_EXAMPLES,
} from '../swagger/signal-keys-management.schemas';

/**
 * Controller for managing Signal Protocol keys
 * 
 * Provides endpoints for uploading, rotating, and deleting keys.
 * These endpoints require authentication.
 */
@ApiTags('Signal Protocol - Key Management')
@Controller('signal/keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SignalKeysManagementController {
	private readonly logger = new Logger(SignalKeysManagementController.name);

	constructor(
		private readonly rotationService: SignalKeyRotationService,
		private readonly validationService: SignalKeyValidationService,
		private readonly storageService: SignalKeyStorageService,
		private readonly devicesService: DevicesService,
	) { }

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
		examples: SIGNED_PREKEY_UPLOAD_EXAMPLES,
	})
	@ApiResponse({
		status: 201,
		description: 'Signed prekey uploaded successfully',
		type: SignedPreKeyUploadResponseDto,
		schema: SIGNED_PREKEY_UPLOAD_RESPONSE_SCHEMA,
		examples: SIGNED_PREKEY_UPLOAD_RESPONSE_EXAMPLES,
	})
	@ApiResponse({ status: 400, description: 'Invalid key format or validation failed', })
	@ApiResponse({ status: 401, description: 'Unauthorized', })
	async uploadSignedPreKey(@Body() signedPreKey: SignedPreKeyDto, @Req() req: any,): Promise<SignedPreKeyUploadResponseDto> {
		const userId = req.user.sub;
		const deviceId = req.user.deviceId;

		this.logger.log(`Upload signed prekey request from user ${userId}, device ${deviceId}`);

		// Validate the signed prekey
		this.validationService.validateSignedPreKey(signedPreKey);

		// Check uniqueness
		await this.validationService.validateSignedPreKeyIdUniqueness(
			userId,
			deviceId,
			signedPreKey.keyId,
		);

		// Rotate the key
		await this.rotationService.rotateSignedPreKey(userId, deviceId, signedPreKey);

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
		examples: PREKEYS_UPLOAD_EXAMPLES,
	})
	@ApiResponse({
		status: 201,
		description: 'PreKeys uploaded successfully',
		type: PreKeysUploadResponseDto,
		schema: PREKEYS_UPLOAD_RESPONSE_SCHEMA,
		examples: PREKEYS_UPLOAD_RESPONSE_EXAMPLES,
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
	): Promise<PreKeysUploadResponseDto> {
		const userId = req.user.sub;
		const deviceId = req.user.deviceId;

		this.logger.log(
			`Upload ${uploadDto.preKeys.length} prekeys request from user ${userId}, device ${deviceId}`,
		);

		// Validate all prekeys
		this.validationService.validatePreKeys(uploadDto.preKeys);

		// Replenish the keys
		await this.rotationService.replenishPreKeys(userId, deviceId, uploadDto.preKeys);

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
		const userId = req.user.sub;
		const deviceId = req.user.deviceId;

		this.logger.log(`Get rotation recommendations for user ${userId}, device ${deviceId}`);

		return await this.rotationService.getRotationRecommendations(userId, deviceId);
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
	async deleteDeviceKeys(@Param('deviceId') deviceId: string, @Req() req: any): Promise<void> {
		const userId = req.user.sub;

		this.logger.log(`Delete keys for device ${deviceId} by user ${userId}`);

		// Verify the device belongs to the user
		await this.devicesService.revokeDevice(userId, deviceId);

		// Delete only the keys for this specific device
		await this.storageService.deleteAllKeysForDevice(userId, deviceId);

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
		const userId = req.user.sub;

		this.logger.log(`Delete all keys for user ${userId}`);

		await this.storageService.deleteAllKeysForUser(userId);

		this.logger.log(`Successfully deleted all keys for user ${userId}`);
	}
}
