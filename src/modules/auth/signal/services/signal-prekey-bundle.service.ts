import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SignalKeyStorageService } from './signal-key-storage.service';
import { KeyBundleResponseDto, PreKeyStatusDto } from '../dto';

/**
 * Service responsible for building and managing Signal Protocol key bundles
 * 
 * This service orchestrates the retrieval and assembly of key bundles for X3DH,
 * handles prekey consumption, and monitors prekey status.
 */
@Injectable()
export class SignalPreKeyBundleService {
	private readonly logger = new Logger(SignalPreKeyBundleService.name);
	private readonly MIN_PREKEYS_THRESHOLD = 20;
	private readonly RECOMMENDED_PREKEYS = 100;

	constructor(private readonly keyStorage: SignalKeyStorageService) {}

	/**
	 * Get a complete key bundle for a user to initiate an encrypted session
	 * 
	 * This method assembles all the public keys needed for X3DH key exchange:
	 * - Identity Key (long-term)
	 * - Signed PreKey (medium-term with signature)
	 * - PreKey (one-time, optional)
	 * 
	 * @param userId - The user's unique identifier
	 * @param deviceId - Optional device ID for device-specific keys
	 * @returns Complete key bundle for X3DH
	 * @throws NotFoundException if user has no keys registered
	 */
	async getBundleForUser(
		userId: string,
		deviceId?: string,
	): Promise<KeyBundleResponseDto> {
		this.logger.log(`Building key bundle for user ${userId}${deviceId ? ` (device: ${deviceId})` : ''}`);

		// Retrieve the identity key
		const identityKey = await this.keyStorage.getIdentityKey(userId);
		if (!identityKey) {
			throw new NotFoundException(
				`No identity key found for user ${userId}. User may not have registered encryption keys.`,
			);
		}

		// Retrieve the active signed prekey
		const signedPreKey = await this.keyStorage.getActiveSignedPreKey(userId);
		if (!signedPreKey) {
			throw new NotFoundException(
				`No active signed prekey found for user ${userId}. Keys may have expired.`,
			);
		}

		// Retrieve an unused prekey (optional - may not be available)
		const preKey = await this.keyStorage.getUnusedPreKey(userId);

		// Log warning if no prekeys are available
		if (!preKey) {
			this.logger.warn(
				`No unused prekeys available for user ${userId}. Sessions can still be established but without forward secrecy guarantee.`,
			);
		} else {
			// Mark the prekey as used immediately
			await this.keyStorage.markPreKeyAsUsed(preKey.id);
			this.logger.debug(`Marked prekey ${preKey.keyId} as used for user ${userId}`);
		}

		// Build and return the bundle
		const bundle: KeyBundleResponseDto = {
			userId,
			deviceId,
			identityKey: identityKey.publicKey,
			signedPreKey: {
				keyId: signedPreKey.keyId,
				publicKey: signedPreKey.publicKey,
				signature: signedPreKey.signature,
			},
			...(preKey && {
				preKey: {
					keyId: preKey.keyId,
					publicKey: preKey.publicKey,
				},
			}),
		};

		this.logger.log(
			`Successfully built key bundle for user ${userId} (has prekey: ${!!preKey})`,
		);

		return bundle;
	}

	/**
	 * Manually mark a prekey as consumed
	 * 
	 * This is typically called automatically by getBundleForUser,
	 * but can be used manually if needed.
	 * 
	 * @param preKeyId - The UUID of the prekey to consume
	 */
	async consumePreKey(preKeyId: string): Promise<void> {
		this.logger.log(`Manually consuming prekey ${preKeyId}`);
		await this.keyStorage.markPreKeyAsUsed(preKeyId);
	}

	/**
	 * Get the prekey status for a user
	 * 
	 * Returns information about available prekeys and whether
	 * the user needs to upload more.
	 * 
	 * @param userId - The user's unique identifier
	 * @returns PreKey status information
	 */
	async getPreKeyStatus(userId: string): Promise<PreKeyStatusDto> {
		this.logger.debug(`Checking prekey status for user ${userId}`);

		const [availableCount, hasActiveSignedPreKey] = await Promise.all([
			this.keyStorage.getUnusedPreKeyCount(userId),
			this.keyStorage.getActiveSignedPreKey(userId).then((key) => !!key),
		]);

		// Calculate how many prekeys should be uploaded
		const isLow = availableCount < this.MIN_PREKEYS_THRESHOLD;
		const recommendedUpload = isLow
			? this.RECOMMENDED_PREKEYS - availableCount
			: 0;

		if (isLow) {
			this.logger.warn(
				`User ${userId} is running low on prekeys (${availableCount} remaining)`,
			);
		}

		if (!hasActiveSignedPreKey) {
			this.logger.warn(
				`User ${userId} has no active signed prekey. Keys may have expired.`,
			);
		}

		return {
			userId,
			availablePreKeys: availableCount,
			isLow,
			hasActiveSignedPreKey,
			totalPreKeys: availableCount, // In future, could fetch total including used keys
			recommendedUpload,
		};
	}

	/**
	 * Check if a user needs to replenish their prekeys
	 * 
	 * @param userId - The user's unique identifier
	 * @returns true if user should upload more prekeys
	 */
	async needsPreKeyReplenishment(userId: string): Promise<boolean> {
		const count = await this.keyStorage.getUnusedPreKeyCount(userId);
		return count < this.MIN_PREKEYS_THRESHOLD;
	}

	/**
	 * Get multiple key bundles (useful for group operations)
	 * 
	 * @param userIds - Array of user IDs
	 * @returns Map of userId to KeyBundleResponse
	 */
	async getBundlesForUsers(
		userIds: string[],
	): Promise<Map<string, KeyBundleResponseDto>> {
		this.logger.log(`Building key bundles for ${userIds.length} users`);

		const bundles = new Map<string, KeyBundleResponseDto>();

		await Promise.all(
			userIds.map(async (userId) => {
				try {
					const bundle = await this.getBundleForUser(userId);
					bundles.set(userId, bundle);
				} catch (error) {
					this.logger.error(
						`Failed to get bundle for user ${userId}`,
						error.stack,
					);
					// Don't add to map if failed
				}
			}),
		);

		this.logger.log(
			`Successfully built ${bundles.size}/${userIds.length} key bundles`,
		);

		return bundles;
	}
}
