import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan, MoreThan } from 'typeorm';
import { SignedPreKey } from '../entities/signed-prekey.entity';

@Injectable()
export class SignedPreKeyRepository extends Repository<SignedPreKey> {
	constructor(private dataSource: DataSource) {
		super(SignedPreKey, dataSource.createEntityManager());
	}

	/**
	 * Find all signed prekeys for a user
	 */
	async findByUserId(userId: string): Promise<SignedPreKey[]> {
		return this.find({
			where: { userId },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Find the most recent active (non-expired) signed prekey for a user
	 */
	async findActiveByUserId(userId: string): Promise<SignedPreKey | null> {
		return this.findOne({
			where: {
				userId,
				expiresAt: MoreThan(new Date()),
			},
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Find a specific signed prekey by user and key ID
	 */
	async findByUserIdAndKeyId(userId: string, keyId: number): Promise<SignedPreKey | null> {
		return this.findOne({
			where: { userId, keyId },
		});
	}

	/**
	 * Create a new signed prekey
	 */
	async createSignedPreKey(
		userId: string,
		keyId: number,
		publicKey: string,
		signature: string,
		expiresAt: Date,
	): Promise<SignedPreKey> {
		const signedPreKey = this.create({
			userId,
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
	 * Delete expired signed prekeys for a specific user
	 */
	async deleteExpiredByUserId(userId: string): Promise<void> {
		await this.delete({
			userId,
			expiresAt: LessThan(new Date()),
		});
	}

	/**
	 * Delete all signed prekeys for a user
	 */
	async deleteByUserId(userId: string): Promise<void> {
		await this.delete({ userId });
	}
}
