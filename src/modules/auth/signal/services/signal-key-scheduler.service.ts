import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SignalKeyRotationService } from './signal-key-rotation.service';
import { PreKeyRepository } from '../repositories';
import { LessThan } from 'typeorm';

/**
 * Service responsible for scheduled maintenance tasks for Signal Protocol keys
 * 
 * Handles automatic cleanup and monitoring:
 * - Daily cleanup of expired SignedPreKeys
 * - Hourly check for users with low prekeys
 * - Weekly cleanup of old unused prekeys
 */
@Injectable()
export class SignalKeySchedulerService {
	private readonly logger = new Logger(SignalKeySchedulerService.name);
	private lastCleanupTime: Date | null = null;
	private lastPreKeyCheckTime: Date | null = null;
	private lastOldPreKeyCleanupTime: Date | null = null;

	constructor(
		private readonly rotationService: SignalKeyRotationService,
		private readonly preKeyRepository: PreKeyRepository,
	) {}

	/**
	 * Clean up expired SignedPreKeys daily at 3 AM
	 * 
	 * Removes SignedPreKeys that have been expired for more than 30 days.
	 * This grace period ensures that pending sessions can still complete.
	 */
	@Cron(CronExpression.EVERY_DAY_AT_3AM)
	async cleanupExpiredSignedPreKeys(): Promise<void> {
		this.logger.log('Starting scheduled cleanup of expired SignedPreKeys');

		try {
			const deletedCount =
				await this.rotationService.cleanupExpiredSignedPreKeys(30);

			this.lastCleanupTime = new Date();

			this.logger.log(
				`Successfully cleaned up ${deletedCount} expired SignedPreKeys`,
			);

			// Log a warning if a significant number of keys were cleaned up
			if (deletedCount > 100) {
				this.logger.warn(
					`High number of expired keys cleaned up (${deletedCount}). Consider investigating key rotation issues.`,
				);
			}
		} catch (error) {
			this.logger.error(
				'Failed to cleanup expired SignedPreKeys',
				error.stack,
			);
			// Don't throw - we don't want to crash the scheduler
		}
	}

	/**
	 * Check for users with low prekeys every hour
	 * 
	 * Monitors prekey availability and logs warnings for users who need
	 * to replenish their prekeys. In a production system, this would
	 * trigger notifications to clients.
	 */
	@Cron(CronExpression.EVERY_HOUR)
	async checkUsersWithLowPrekeys(): Promise<void> {
		this.logger.debug('Checking users with low prekeys');

		try {
			const usersWithLowPrekeys = await this.findUsersWithLowPrekeys();

			this.lastPreKeyCheckTime = new Date();

			if (usersWithLowPrekeys.length > 0) {
				this.logger.warn(
					`Found ${usersWithLowPrekeys.length} users with low prekeys: ${usersWithLowPrekeys.map((u) => `${u.userId}(${u.count})`).join(', ')}`,
				);

				// In production, emit events here for notification service
				// this.eventEmitter.emit('signal.prekeys.low', usersWithLowPrekeys);
			} else {
				this.logger.debug('All users have sufficient prekeys');
			}
		} catch (error) {
			this.logger.error('Failed to check users with low prekeys', error.stack);
		}
	}

	/**
	 * Clean up old unused prekeys every Sunday at 4 AM
	 * 
	 * Removes prekeys that have been unused for more than 30 days.
	 * This helps keep the database size under control.
	 */
	@Cron(CronExpression.EVERY_WEEK)
	async cleanupOldUnusedPreKeys(): Promise<void> {
		this.logger.log('Starting scheduled cleanup of old unused PreKeys');

		try {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			// Find old unused prekeys
			const oldPreKeys = await this.preKeyRepository.find({
				where: {
					isUsed: false,
					createdAt: LessThan(thirtyDaysAgo),
				},
			});

			if (oldPreKeys.length > 0) {
				// Delete them
				await this.preKeyRepository.remove(oldPreKeys);

				this.lastOldPreKeyCleanupTime = new Date();

				this.logger.log(
					`Successfully cleaned up ${oldPreKeys.length} old unused PreKeys`,
				);

				// Group by user for better visibility
				const byUser = oldPreKeys.reduce(
					(acc, pk) => {
						acc[pk.userId] = (acc[pk.userId] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				);

				this.logger.debug(
					`PreKeys cleaned per user: ${JSON.stringify(byUser)}`,
				);
			} else {
				this.logger.debug('No old unused PreKeys to clean up');
			}
		} catch (error) {
			this.logger.error(
				'Failed to cleanup old unused PreKeys',
				error.stack,
			);
		}
	}

	/**
	 * Find users who have fewer than 20 unused prekeys
	 * 
	 * @returns Array of objects with userId and prekey count
	 */
	private async findUsersWithLowPrekeys(): Promise<
		Array<{ userId: string; count: number }>
	> {
		const result = await this.preKeyRepository
			.createQueryBuilder('prekey')
			.select('prekey.userId', 'userId')
			.addSelect('COUNT(*)', 'count')
			.where('prekey.isUsed = false')
			.groupBy('prekey.userId')
			.having('COUNT(*) < :threshold', { threshold: 20 })
			.getRawMany();

		return result.map((r) => ({
			userId: r.userId,
			count: parseInt(r.count, 10),
		}));
	}

	/**
	 * Get scheduler statistics for health checks
	 * 
	 * @returns Object with scheduler status information
	 */
	getSchedulerStats(): {
		lastCleanupTime: Date | null;
		lastPreKeyCheckTime: Date | null;
		lastOldPreKeyCleanupTime: Date | null;
		isHealthy: boolean;
	} {
		const now = new Date();
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

		// Consider unhealthy if cleanup hasn't run in more than 25 hours
		// or prekey check hasn't run in more than 2 hours
		const isHealthy =
			(!this.lastCleanupTime || this.lastCleanupTime > oneDayAgo) &&
			(!this.lastPreKeyCheckTime || this.lastPreKeyCheckTime > twoHoursAgo);

		return {
			lastCleanupTime: this.lastCleanupTime,
			lastPreKeyCheckTime: this.lastPreKeyCheckTime,
			lastOldPreKeyCleanupTime: this.lastOldPreKeyCleanupTime,
			isHealthy,
		};
	}

	/**
	 * Manually trigger cleanup (for testing or admin operations)
	 */
	async manualCleanup(): Promise<{
		expiredKeysDeleted: number;
		oldPreKeysDeleted: number;
	}> {
		this.logger.log('Manual cleanup triggered');

		const expiredKeysDeleted =
			await this.rotationService.cleanupExpiredSignedPreKeys(30);

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const oldPreKeys = await this.preKeyRepository.find({
			where: {
				isUsed: false,
				createdAt: LessThan(thirtyDaysAgo),
			},
		});

		await this.preKeyRepository.remove(oldPreKeys);

		this.logger.log(
			`Manual cleanup completed: ${expiredKeysDeleted} expired keys, ${oldPreKeys.length} old prekeys`,
		);

		return {
			expiredKeysDeleted,
			oldPreKeysDeleted: oldPreKeys.length,
		};
	}
}
