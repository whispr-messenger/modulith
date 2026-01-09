import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { IdentityKey } from '../entities/identity-key.entity';

@Injectable()
export class IdentityKeyRepository extends Repository<IdentityKey> {
	constructor(private dataSource: DataSource) {
		super(IdentityKey, dataSource.createEntityManager());
	}

	/**
	 * Find the identity key for a specific user and device
	 */
	async findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<IdentityKey | null> {
		return this.findOne({
			where: { userId, deviceId },
		});
	}

	/**
	 * Create or update an identity key for a user and device
	 */
	async upsertIdentityKey(userId: string, deviceId: string, publicKey: string): Promise<IdentityKey> {
		const existingKey = await this.findByUserIdAndDeviceId(userId, deviceId);

		if (existingKey) {
			existingKey.publicKey = publicKey;
			existingKey.updatedAt = new Date();
			return this.save(existingKey);
		}

		const newKey = this.create({
			userId,
			deviceId,
			publicKey,
		});

		return this.save(newKey);
	}

	/**
	 * Delete identity key for a user and device
	 */
	async deleteByUserIdAndDeviceId(userId: string, deviceId: string): Promise<void> {
		await this.delete({ userId, deviceId });
	}

	/**
	 * Delete all identity keys for a user (all devices)
	 */
	async deleteByUserId(userId: string): Promise<void> {
		await this.delete({ userId });
	}
}
