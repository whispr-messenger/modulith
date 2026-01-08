import { Injectable, Logger } from '@nestjs/common';
import { IdentityKeyRepository } from '../repositories/identity-key.repository';
import { SignedPreKeyRepository } from '../repositories/signed-prekey.repository';
import { PreKeyRepository } from '../repositories/prekey.repository';
import { IdentityKey } from '../entities/identity-key.entity';
import { SignedPreKey } from '../entities/signed-prekey.entity';
import { PreKey } from '../entities/prekey.entity';
import { SignedPreKeyDto, PreKeyDto } from '../dto';

/**
 * Service responsible for storing and retrieving Signal Protocol cryptographic keys
 * 
 * This service provides a unified interface for managing:
 * - Identity Keys (long-term user identity)
 * - Signed PreKeys (medium-term keys for forward secrecy)
 * - PreKeys (one-time use keys for X3DH)
 */
@Injectable()
export class SignalKeyStorageService {
	private readonly logger = new Logger(SignalKeyStorageService.name);

	constructor(
		private readonly identityKeyRepository: IdentityKeyRepository,
		private readonly signedPreKeyRepository: SignedPreKeyRepository,
		private readonly preKeyRepository: PreKeyRepository,
	) {}

	/**
	 * Store or update the identity key for a user
	 * 
	 * @param userId - The user's unique identifier
	 * @param identityKey - The public part of the identity key (base64 encoded)
	 * @returns The stored IdentityKey entity
	 */
	async storeIdentityKey(userId: string, identityKey: string): Promise<IdentityKey> {
		this.logger.log(`Storing identity key for user ${userId}`);

		try {
			return await this.identityKeyRepository.upsertIdentityKey(userId, identityKey);
		} catch (error) {
			this.logger.error(`Failed to store identity key for user ${userId}`, error.stack);
			throw error;
		}
	}

	/**
	 * Store a new signed prekey for a user
	 * 
	 * @param userId - The user's unique identifier
	 * @param signedPreKey - The signed prekey data (keyId, publicKey, signature)
	 * @returns The stored SignedPreKey entity
	 */
	async storeSignedPreKey(
		userId: string,
		signedPreKey: SignedPreKeyDto,
	): Promise<SignedPreKey> {
		this.logger.log(`Storing signed prekey ${signedPreKey.keyId} for user ${userId}`);

		try {
			// SignedPreKeys typically expire after 7 days
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			return await this.signedPreKeyRepository.createSignedPreKey(
				userId,
				signedPreKey.keyId,
				signedPreKey.publicKey,
				signedPreKey.signature,
				expiresAt,
			);
		} catch (error) {
			this.logger.error(
				`Failed to store signed prekey for user ${userId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Store multiple prekeys for a user
	 * 
	 * @param userId - The user's unique identifier
	 * @param preKeys - Array of prekeys to store
	 * @returns Array of stored PreKey entities
	 */
	async storePreKeys(userId: string, preKeys: PreKeyDto[]): Promise<PreKey[]> {
		this.logger.log(`Storing ${preKeys.length} prekeys for user ${userId}`);

		try {
			return await this.preKeyRepository.createPreKeys(
				userId,
				preKeys.map((pk) => ({
					keyId: pk.keyId,
					publicKey: pk.publicKey,
				})),
			);
		} catch (error) {
			this.logger.error(`Failed to store prekeys for user ${userId}`, error.stack);
			throw error;
		}
	}

	/**
	 * Retrieve the identity key for a user
	 * 
	 * @param userId - The user's unique identifier
	 * @returns The user's IdentityKey or null if not found
	 */
	async getIdentityKey(userId: string): Promise<IdentityKey | null> {
		this.logger.debug(`Retrieving identity key for user ${userId}`);

		try {
			return await this.identityKeyRepository.findByUserId(userId);
		} catch (error) {
			this.logger.error(
				`Failed to retrieve identity key for user ${userId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Retrieve the most recent active (non-expired) signed prekey for a user
	 * 
	 * @param userId - The user's unique identifier
	 * @returns The active SignedPreKey or null if none available
	 */
	async getActiveSignedPreKey(userId: string): Promise<SignedPreKey | null> {
		this.logger.debug(`Retrieving active signed prekey for user ${userId}`);

		try {
			return await this.signedPreKeyRepository.findActiveByUserId(userId);
		} catch (error) {
			this.logger.error(
				`Failed to retrieve active signed prekey for user ${userId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Retrieve a random unused prekey for a user
	 * 
	 * This method is used when building a key bundle for X3DH.
	 * It selects a random prekey to improve security through unpredictability.
	 * 
	 * @param userId - The user's unique identifier
	 * @returns An unused PreKey or null if none available
	 */
	async getUnusedPreKey(userId: string): Promise<PreKey | null> {
		this.logger.debug(`Retrieving unused prekey for user ${userId}`);

		try {
			return await this.preKeyRepository.getRandomUnusedPreKey(userId);
		} catch (error) {
			this.logger.error(
				`Failed to retrieve unused prekey for user ${userId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Get the count of unused prekeys for a user
	 * 
	 * This is useful for monitoring and triggering replenishment when low.
	 * 
	 * @param userId - The user's unique identifier
	 * @returns The number of unused prekeys available
	 */
	async getUnusedPreKeyCount(userId: string): Promise<number> {
		this.logger.debug(`Counting unused prekeys for user ${userId}`);

		try {
			return await this.preKeyRepository.countUnusedByUserId(userId);
		} catch (error) {
			this.logger.error(
				`Failed to count unused prekeys for user ${userId}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Mark a prekey as used after it has been consumed in X3DH
	 * 
	 * @param preKeyId - The UUID of the prekey to mark as used
	 */
	async markPreKeyAsUsed(preKeyId: string): Promise<void> {
		this.logger.log(`Marking prekey ${preKeyId} as used`);

		try {
			await this.preKeyRepository.markAsUsed(preKeyId);
		} catch (error) {
			this.logger.error(`Failed to mark prekey ${preKeyId} as used`, error.stack);
			throw error;
		}
	}

	/**
	 * Delete all keys for a user (for account deletion or device removal)
	 * 
	 * @param userId - The user's unique identifier
	 */
	async deleteAllKeysForUser(userId: string): Promise<void> {
		this.logger.log(`Deleting all keys for user ${userId}`);

		try {
			await Promise.all([
				this.identityKeyRepository.deleteByUserId(userId),
				this.signedPreKeyRepository.deleteByUserId(userId),
				this.preKeyRepository.deleteByUserId(userId),
			]);
		} catch (error) {
			this.logger.error(`Failed to delete keys for user ${userId}`, error.stack);
			throw error;
		}
	}
}
