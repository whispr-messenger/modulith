import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import { PreKey } from '../entities/prekey.entity';

@Injectable()
export class PreKeyRepository extends Repository<PreKey> {
	constructor(private dataSource: DataSource) {
		super(PreKey, dataSource.createEntityManager());
	}

	/**
	 * Find all prekeys for a user and device
	 */
	async findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<PreKey[]> {
		return this.find({
			where: { userId, deviceId },
			order: { createdAt: 'ASC' },
		});
	}

	/**
	 * Find all unused prekeys for a user and device
	 */
	async findUnusedByUserIdAndDeviceId(userId: string, deviceId: string): Promise<PreKey[]> {
		return this.find({
			where: {
				userId,
				deviceId,
				isUsed: false,
			},
			order: { createdAt: 'ASC' },
		});
	}

	/**
	 * Get a random unused prekey for a user and device
	 */
	async getRandomUnusedPreKey(userId: string, deviceId: string): Promise<PreKey | null> {
		const unusedKeys = await this.findUnusedByUserIdAndDeviceId(userId, deviceId);

		if (unusedKeys.length === 0) {
			return null;
		}

		// Return a random prekey from the unused ones
		const randomIndex = Math.floor(Math.random() * unusedKeys.length);
		return unusedKeys[randomIndex];
	}

	/**
	 * Count unused prekeys for a user and device
	 */
	async countUnusedByUserIdAndDeviceId(userId: string, deviceId: string): Promise<number> {
		return this.count({
			where: {
				userId,
				deviceId,
				isUsed: false,
			},
		});
	}

	/**
	 * Mark a prekey as used
	 */
	async markAsUsed(preKeyId: string): Promise<void> {
		await this.update(preKeyId, { isUsed: true });
	}

	/**
	 * Create multiple prekeys at once
	 */
	async createPreKeys(
		userId: string,
		deviceId: string,
		preKeys: Array<{ keyId: number; publicKey: string }>,
	): Promise<PreKey[]> {
		const entities = preKeys.map((pk) =>
			this.create({
				userId,
				deviceId,
				keyId: pk.keyId,
				publicKey: pk.publicKey,
				isOneTime: true,
				isUsed: false,
			}),
		);

		return this.save(entities);
	}

	/**
	 * Find old unused prekeys (older than specified days)
	 */
	async findOldUnused(days: number = 30): Promise<PreKey[]> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		return this.find({
			where: {
				isUsed: false,
				createdAt: LessThan(cutoffDate),
			},
		});
	}

	/**
	 * Delete old unused prekeys
	 */
	async deleteOldUnused(days: number = 30): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		await this.delete({
			isUsed: false,
			createdAt: LessThan(cutoffDate),
		});
	}

	/**
	 * Delete used prekeys older than specified days
	 */
	async deleteOldUsed(days: number = 7): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		await this.delete({
			isUsed: true,
			createdAt: LessThan(cutoffDate),
		});
	}

	/**
	 * Delete all prekeys for a user and device
	 */
	async deleteByUserIdAndDeviceId(userId: string, deviceId: string): Promise<void> {
		await this.delete({ userId, deviceId });
	}

	/**
	 * Delete all prekeys for a user (all devices)
	 */
	async deleteByUserId(userId: string): Promise<void> {
		await this.delete({ userId });
	}
}
