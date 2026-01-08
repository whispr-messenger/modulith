import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { IdentityKey } from '../entities/identity-key.entity';

@Injectable()
export class IdentityKeyRepository extends Repository<IdentityKey> {
	constructor(private dataSource: DataSource) {
		super(IdentityKey, dataSource.createEntityManager());
	}

	/**
	 * Find the identity key for a specific user
	 */
	async findByUserId(userId: string): Promise<IdentityKey | null> {
		return this.findOne({
			where: { userId },
		});
	}

	/**
	 * Create or update an identity key for a user
	 */
	async upsertIdentityKey(userId: string, publicKey: string): Promise<IdentityKey> {
		const existingKey = await this.findByUserId(userId);

		if (existingKey) {
			existingKey.publicKey = publicKey;
			existingKey.updatedAt = new Date();
			return this.save(existingKey);
		}

		const newKey = this.create({
			userId,
			publicKey,
		});

		return this.save(newKey);
	}

	/**
	 * Delete identity key for a user
	 */
	async deleteByUserId(userId: string): Promise<void> {
		await this.delete({ userId });
	}
}
