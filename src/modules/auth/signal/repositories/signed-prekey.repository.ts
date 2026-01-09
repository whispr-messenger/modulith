import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan, MoreThan } from 'typeorm';
import { SignedPreKey } from '../entities/signed-prekey.entity';

@Injectable()
export class SignedPreKeyRepository extends Repository<SignedPreKey> {
	constructor(private dataSource: DataSource) {
		super(SignedPreKey, dataSource.createEntityManager());
	}

	/**
	 * Find all signed prekeys for a user and device
	 */
	async findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<SignedPreKey[]> {
		return this.find({
			where: { userId, deviceId },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Find the most recent active (non-expired) signed prekey for a user and device
	 */
	async findActiveByUserIdAndDeviceId(userId: string, deviceId: string): Promise<SignedPreKey | null> {
		return this.findOne({
			where: {
				userId,
				deviceId,
				expiresAt: MoreThan(new Date()),
			},
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Find a specific signed prekey by user, device and key ID
	 */
	async findByUserIdDeviceIdAndKeyId(userId: string, deviceId: string, keyId: number): Promise<SignedPreKey | null> {
		return this.findOne({
			where: { userId, deviceId, keyId },
		});
	}

	/**
	 * Create a new signed prekey
	 */
	async createSignedPreKey(
		userId: string,
		deviceId: string,
		keyId: number,
		publicKey: string,
		signature: string,
		expiresAt: Date,
	): Promise<SignedPreKey> {
		const signedPreKey = this.create({
			userId,
			deviceId,
			keyId,
			publicKey,
			signature,
			expiresAt,
		});

		return this.save(signedPreKey);
	}

	/**
	 * Find all expired signed prekeys
	 */
	async findExpired(): Promise<SignedPreKey[]> {
		return this.find({
			where: {
				expiresAt: LessThan(new Date()),
			},
		});
	}

	/**
	 * Delete expired signed prekeys for a specific user and device
	 */
	async deleteExpiredByUserIdAndDeviceId(userId: string, deviceId: string): Promise<void> {
		await this.delete({
			userId,
			deviceId,
			expiresAt: LessThan(new Date()),
		});
	}

	/**
	 * Delete all signed prekeys for a user and device
	 */
	async deleteByUserIdAndDeviceId(userId: string, deviceId: string): Promise<void> {
		await this.delete({ userId, deviceId });
	}

	/**
	 * Delete all signed prekeys for a user (all devices)
	 */
	async deleteByUserId(userId: string): Promise<void> {
		await this.delete({ userId });
	}
}
