import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SignalKeyStorageService } from './signal-key-storage.service';
import { SignedPreKeyDto, PreKeyDto } from '../dto';
import { SignedPreKeyRepository } from '../repositories';

/**
 * Service responsible for rotating Signal Protocol keys
 * 
 * Handles the lifecycle of cryptographic keys including:
 * - Rotating signed prekeys before expiration
 * - Replenishing one-time prekeys when running low
 * - Monitoring key status and triggering alerts
 */
@Injectable()
export class SignalKeyRotationService {
	private readonly logger = new Logger(SignalKeyRotationService.name);
	private readonly MIN_PREKEYS_THRESHOLD = 20;
	private readonly SIGNED_PREKEY_LIFETIME_DAYS = 7;

	constructor(
		private readonly keyStorage: SignalKeyStorageService,
		private readonly signedPreKeyRepository: SignedPreKeyRepository,
	) {}

	/**
	 * Rotate the signed prekey for a user and device
	 * 
	 * This should be called periodically (recommended every 7 days) to maintain
	 * forward secrecy. Old signed prekeys are kept for a grace period to allow
	 * pending sessions to complete.
	 * 
	 * @param userId - The user's unique identifier
	 * @param deviceId - The device's unique identifier
	 * @param newSignedPreKey - The new signed prekey to store
	 */
	async rotateSignedPreKey(
		userId: string,
		deviceId: string,
		newSignedPreKey: SignedPreKeyDto,
	): Promise<void> {
		this.logger.log(`Rotating signed prekey for user ${userId}, device ${deviceId}`);

		try {
			// Store the new signed prekey
			await this.keyStorage.storeSignedPreKey(userId, deviceId, newSignedPreKey);

			// Optional: Delete expired signed prekeys (older than 30 days)
			// Keep recent ones for a grace period
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			this.logger.log(
				`Successfully rotated signed prekey ${newSignedPreKey.keyId} for user ${userId}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to rotate signed prekey for user ${userId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Replenish prekeys for a user and device
	 * 
	 * Adds new one-time prekeys to the device's pool. This should be called
	 * when the available prekey count falls below the threshold.
	 * 
	 * @param userId - The user's unique identifier
	 * @param deviceId - The device's unique identifier
	 * @param newPreKeys - Array of new prekeys to add
	 */
	async replenishPreKeys(
		userId: string,
		deviceId: string,
		newPreKeys: PreKeyDto[],
	): Promise<void> {
		this.logger.log(`Replenishing ${newPreKeys.length} prekeys for user ${userId}, device ${deviceId}`);

		try {
			// Validate that we're not adding too many prekeys
			const currentCount = await this.keyStorage.getUnusedPreKeyCount(userId, deviceId);
			const totalAfterReplenish = currentCount + newPreKeys.length;

			if (totalAfterReplenish > 200) {
				throw new BadRequestException(
					`Cannot add ${newPreKeys.length} prekeys. Total would exceed maximum of 200 (current: ${currentCount})`,
				);
			}

			// Store the new prekeys
			await this.keyStorage.storePreKeys(userId, deviceId, newPreKeys);

			this.logger.log(
				`Successfully replenished prekeys for user ${userId}, device ${deviceId}. New total: ${totalAfterReplenish}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to replenish prekeys for user ${userId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Check if a device has low prekeys
	 * 
	 * Returns true if the device's available prekey count is below the threshold,
	 * indicating they should upload more prekeys.
	 * 
	 * @param userId - The user's unique identifier
	 * @param deviceId - The device's unique identifier
	 * @returns true if prekeys are below threshold
	 */
	async checkLowPreKeys(userId: string, deviceId: string): Promise<boolean> {
		const count = await this.keyStorage.getUnusedPreKeyCount(userId, deviceId);
		const isLow = count < this.MIN_PREKEYS_THRESHOLD;

		if (isLow) {
			this.logger.warn(
				`User ${userId}, device ${deviceId} has low prekeys: ${count} remaining (threshold: ${this.MIN_PREKEYS_THRESHOLD})`,
			);
		}

		return isLow;
	}

	/**
	 * Check if a device's signed prekey needs rotation
	 * 
	 * Returns true if the current signed prekey is expiring soon (within 1 day)
	 * or has already expired.
	 * 
	 * @param userId - The user's unique identifier
	 * @param deviceId - The device's unique identifier
	 * @returns true if signed prekey needs rotation
	 */
	async needsSignedPreKeyRotation(userId: string, deviceId: string): Promise<boolean> {
		const signedPreKey = await this.keyStorage.getActiveSignedPreKey(userId, deviceId);

		if (!signedPreKey) {
			this.logger.warn(`User ${userId}, device ${deviceId} has no active signed prekey`);
			return true;
		}

		// Check if expiring within 24 hours
		const oneDayFromNow = new Date();
		oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

		const needsRotation = signedPreKey.expiresAt <= oneDayFromNow;

		if (needsRotation) {
			this.logger.warn(
				`User ${userId}, device ${deviceId} signed prekey expires at ${signedPreKey.expiresAt}. Rotation recommended.`,
			);
		}

		return needsRotation;
	}

	/**
	 * Get rotation recommendations for a device
	 * 
	 * Returns information about what keys need to be rotated/replenished.
	 * 
	 * @param userId - The user's unique identifier
	 * @param deviceId - The device's unique identifier
	 * @returns Object with rotation recommendations
	 */
	async getRotationRecommendations(userId: string, deviceId: string): Promise<{
		needsPreKeyReplenishment: boolean;
		needsSignedPreKeyRotation: boolean;
		availablePreKeys: number;
		recommendedPreKeyUpload: number;
		signedPreKeyExpiresAt?: Date;
	}> {
		const [needsPreKeys, needsRotation, availablePreKeys, signedPreKey] =
			await Promise.all([
				this.checkLowPreKeys(userId, deviceId),
				this.needsSignedPreKeyRotation(userId, deviceId),
				this.keyStorage.getUnusedPreKeyCount(userId, deviceId),
				this.keyStorage.getActiveSignedPreKey(userId, deviceId),
			]);

		const recommendedUpload = needsPreKeys ? 100 - availablePreKeys : 0;

		return {
			needsPreKeyReplenishment: needsPreKeys,
			needsSignedPreKeyRotation: needsRotation,
			availablePreKeys,
			recommendedPreKeyUpload: recommendedUpload,
			signedPreKeyExpiresAt: signedPreKey?.expiresAt,
		};
	}

	/**
	 * Delete expired signed prekeys
	 * 
	 * Removes signed prekeys that have been expired for more than the grace period.
	 * Called periodically by a cron job.
	 * 
	 * @param gracePeriodDays - Number of days to keep expired keys (default: 30)
	 */
	async cleanupExpiredSignedPreKeys(gracePeriodDays: number = 30): Promise<number> {
		this.logger.log('Starting cleanup of expired signed prekeys');

		try {
			const expiredKeys = await this.signedPreKeyRepository.findExpired();
			const gracePeriodDate = new Date();
			gracePeriodDate.setDate(gracePeriodDate.getDate() - gracePeriodDays);

			let deletedCount = 0;

			for (const key of expiredKeys) {
				// Only delete if expired before grace period
				if (key.expiresAt < gracePeriodDate) {
					await this.signedPreKeyRepository.delete(key.id);
					deletedCount++;
				}
			}

			this.logger.log(`Cleaned up ${deletedCount} expired signed prekeys`);
			return deletedCount;
		} catch (error) {
			this.logger.error('Failed to cleanup expired signed prekeys', error.stack);
			throw error;
		}
	}
}
