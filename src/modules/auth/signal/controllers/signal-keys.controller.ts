import {
	Controller,
	Get,
	Param,
	NotFoundException,
	Logger,
	HttpCode,
	HttpStatus,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBearerAuth,
} from '@nestjs/swagger';
import { SignalPreKeyBundleService } from '../services';
import { KeyBundleResponseDto, PreKeyStatusDto } from '../dto';

/**
 * Public controller for retrieving Signal Protocol key bundles
 * 
 * These endpoints allow users to fetch the public keys of other users
 * to initiate encrypted conversations using the X3DH protocol.
 */
@ApiTags('Signal Protocol - Key Bundles')
@Controller('signal/keys')
export class SignalKeysController {
	private readonly logger = new Logger(SignalKeysController.name);

	constructor(
		private readonly prKeyBundleService: SignalPreKeyBundleService,
	) {}

	/**
	 * GET /api/v1/signal/keys/:userId
	 * 
	 * DEPRECATED: Use /api/v1/signal/keys/:userId/devices/:deviceId instead.
	 * This endpoint is kept for backward compatibility but requires deviceId.
	 */
	@Get(':userId')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: '[DEPRECATED] Get key bundle for a user',
		description:
			'DEPRECATED: Please use /api/v1/signal/keys/:userId/devices/:deviceId instead. This endpoint returns 400 Bad Request. In a multi-device setup, you must specify which device to get keys for.',
	})
	@ApiParam({
		name: 'userId',
		description: 'The UUID of the user whose keys to retrieve',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@ApiResponse({
		status: 400,
		description: 'Bad Request - deviceId is required',
	})
	@ApiResponse({
		status: 404,
		description: 'User not found or has no registered keys',
	})
	async getKeyBundle(
		@Param('userId') userId: string,
	): Promise<KeyBundleResponseDto> {
		this.logger.warn(`Deprecated endpoint called: GET /signal/keys/${userId}`);
		
		throw new NotFoundException(
			'This endpoint is deprecated. Please use /signal/keys/:userId/devices/:deviceId to specify which device keys to retrieve.',
		);
	}

	/**
	 * GET /api/v1/signal/keys/:userId/devices/:deviceId
	 * 
	 * Retrieve the key bundle for a specific device of a user.
	 * Useful for multi-device support.
	 */
	@Get(':userId/devices/:deviceId')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Get key bundle for a specific device',
		description:
			'Retrieves the Signal Protocol key bundle for a specific device of a user. Used in multi-device scenarios.',
	})
	@ApiParam({
		name: 'userId',
		description: 'The UUID of the user',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@ApiParam({
		name: 'deviceId',
		description: 'The UUID of the device',
		example: '987fcdeb-51a2-43f7-9c8d-123456789abc',
	})
	@ApiResponse({
		status: 200,
		description: 'Device key bundle successfully retrieved',
		type: KeyBundleResponseDto,
	})
	@ApiResponse({
		status: 404,
		description: 'User or device not found',
	})
	async getKeyBundleForDevice(
		@Param('userId') userId: string,
		@Param('deviceId') deviceId: string,
	): Promise<KeyBundleResponseDto> {
		this.logger.log(
			`Request for device key bundle: userId=${userId}, deviceId=${deviceId}`,
		);

		try {
			return await this.prKeyBundleService.getBundleForUser(userId, deviceId);
		} catch (error) {
			if (error instanceof NotFoundException) {
				this.logger.warn(
					`Key bundle not found for user ${userId}, device ${deviceId}`,
				);
				throw error;
			}
			this.logger.error(
				`Failed to get key bundle for user ${userId}, device ${deviceId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * GET /api/v1/signal/keys/:userId/devices/:deviceId/status
	 * 
	 * Get the prekey status for a specific device (for monitoring)
	 */
	@Get(':userId/devices/:deviceId/status')
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Get prekey status for a device',
		description:
			'Returns information about the number of available prekeys and whether the device needs to upload more. Used for monitoring and alerting.',
	})
	@ApiParam({
		name: 'userId',
		description: 'The UUID of the user',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@ApiParam({
		name: 'deviceId',
		description: 'The UUID of the device',
		example: '987fcdeb-51a2-43f7-9c8d-123456789abc',
	})
	@ApiResponse({
		status: 200,
		description: 'PreKey status retrieved successfully',
		type: PreKeyStatusDto,
	})
	async getPreKeyStatus(
		@Param('userId') userId: string,
		@Param('deviceId') deviceId: string,
	): Promise<PreKeyStatusDto> {
		this.logger.log(`Request for prekey status: userId=${userId}, deviceId=${deviceId}`);

		return await this.prKeyBundleService.getPreKeyStatus(userId, deviceId);
	}
}
