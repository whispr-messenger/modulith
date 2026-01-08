import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SignedPreKeyDto, PreKeyDto } from '../dto';
import { SignedPreKeyRepository } from '../repositories';

/**
 * Service responsible for validating Signal Protocol keys
 * 
 * Performs cryptographic validation and business rule checks on keys
 * before they are stored in the database.
 */
@Injectable()
export class SignalKeyValidationService {
	private readonly logger = new Logger(SignalKeyValidationService.name);

	// Base64 pattern for Curve25519 public keys (typically 44 characters)
	private readonly BASE64_PATTERN = /^[A-Za-z0-9+/]+=*$/;
	private readonly MIN_KEY_LENGTH = 32;
	private readonly MAX_KEY_LENGTH = 100;

	constructor(private readonly signedPreKeyRepository: SignedPreKeyRepository) {}

	/**
	 * Validate the format of a public key
	 * 
	 * Checks that the key is properly base64 encoded and has reasonable length.
	 * Note: Full Curve25519 validation would require native crypto libraries.
	 * 
	 * @param publicKey - Base64-encoded public key
	 * @throws BadRequestException if key format is invalid
	 */
	validatePublicKeyFormat(publicKey: string): void {
		if (!publicKey || typeof publicKey !== 'string') {
			throw new BadRequestException('Public key must be a non-empty string');
		}

		if (!this.BASE64_PATTERN.test(publicKey)) {
			throw new BadRequestException('Public key must be valid base64 encoding');
		}

		if (publicKey.length < this.MIN_KEY_LENGTH) {
			throw new BadRequestException(
				`Public key too short (minimum ${this.MIN_KEY_LENGTH} characters)`,
			);
		}

		if (publicKey.length > this.MAX_KEY_LENGTH) {
			throw new BadRequestException(
				`Public key too long (maximum ${this.MAX_KEY_LENGTH} characters)`,
			);
		}
	}

	/**
	 * Validate a signed prekey
	 * 
	 * Checks the format of the public key and signature.
	 * Note: Actual signature verification would require the identity key
	 * and is typically done client-side.
	 * 
	 * @param signedPreKey - The signed prekey to validate
	 * @throws BadRequestException if validation fails
	 */
	validateSignedPreKey(signedPreKey: SignedPreKeyDto): void {
		if (!signedPreKey) {
			throw new BadRequestException('Signed prekey is required');
		}

		// Validate keyId
		if (typeof signedPreKey.keyId !== 'number' || signedPreKey.keyId < 0) {
			throw new BadRequestException('Signed prekey keyId must be a non-negative number');
		}

		// Validate public key format
		this.validatePublicKeyFormat(signedPreKey.publicKey);

		// Validate signature format
		if (!signedPreKey.signature || typeof signedPreKey.signature !== 'string') {
			throw new BadRequestException('Signature is required and must be a string');
		}

		if (!this.BASE64_PATTERN.test(signedPreKey.signature)) {
			throw new BadRequestException('Signature must be valid base64 encoding');
		}

		this.logger.debug(`Validated signed prekey with keyId ${signedPreKey.keyId}`);
	}

	/**
	 * Validate a prekey
	 * 
	 * Checks the format and keyId of a prekey.
	 * 
	 * @param preKey - The prekey to validate
	 * @throws BadRequestException if validation fails
	 */
	validatePreKey(preKey: PreKeyDto): void {
		if (!preKey) {
			throw new BadRequestException('PreKey is required');
		}

		// Validate keyId
		if (typeof preKey.keyId !== 'number' || preKey.keyId < 0) {
			throw new BadRequestException('PreKey keyId must be a non-negative number');
		}

		// Validate public key format
		this.validatePublicKeyFormat(preKey.publicKey);

		this.logger.debug(`Validated prekey with keyId ${preKey.keyId}`);
	}

	/**
	 * Validate an array of prekeys
	 * 
	 * Checks each prekey and ensures keyIds are unique within the batch.
	 * 
	 * @param preKeys - Array of prekeys to validate
	 * @throws BadRequestException if validation fails
	 */
	validatePreKeys(preKeys: PreKeyDto[]): void {
		if (!Array.isArray(preKeys)) {
			throw new BadRequestException('PreKeys must be an array');
		}

		if (preKeys.length === 0) {
			throw new BadRequestException('At least one prekey is required');
		}

		if (preKeys.length > 200) {
			throw new BadRequestException(
				'Cannot upload more than 200 prekeys at once',
			);
		}

		// Check for duplicate keyIds in the batch
		const keyIds = new Set<number>();

		for (const preKey of preKeys) {
			this.validatePreKey(preKey);

			if (keyIds.has(preKey.keyId)) {
				throw new BadRequestException(
					`Duplicate keyId found in batch: ${preKey.keyId}`,
				);
			}

			keyIds.add(preKey.keyId);
		}

		this.logger.debug(`Validated ${preKeys.length} prekeys`);
	}

	/**
	 * Check if a signed prekey keyId is unique for a user
	 * 
	 * @param userId - The user's ID
	 * @param keyId - The keyId to check
	 * @returns true if the keyId is unique
	 */
	async isSignedPreKeyIdUnique(userId: string, keyId: number): Promise<boolean> {
		const existing = await this.signedPreKeyRepository.findByUserIdAndKeyId(
			userId,
			keyId,
		);
		return !existing;
	}

	/**
	 * Validate that a signed prekey keyId is unique for a user
	 * 
	 * @param userId - The user's ID
	 * @param keyId - The keyId to check
	 * @throws BadRequestException if keyId is not unique
	 */
	async validateSignedPreKeyIdUniqueness(
		userId: string,
		keyId: number,
	): Promise<void> {
		const isUnique = await this.isSignedPreKeyIdUnique(userId, keyId);

		if (!isUnique) {
			throw new BadRequestException(
				`Signed prekey with keyId ${keyId} already exists for this user`,
			);
		}
	}

	/**
	 * Validate an identity key
	 * 
	 * @param identityKey - Base64-encoded identity key
	 * @throws BadRequestException if validation fails
	 */
	validateIdentityKey(identityKey: string): void {
		if (!identityKey || typeof identityKey !== 'string') {
			throw new BadRequestException('Identity key is required');
		}

		this.validatePublicKeyFormat(identityKey);

		this.logger.debug('Validated identity key');
	}

	/**
	 * Validate a complete key bundle
	 * 
	 * Validates all components of a Signal key bundle.
	 * 
	 * @param identityKey - The identity key
	 * @param signedPreKey - The signed prekey
	 * @param preKeys - Array of prekeys
	 * @throws BadRequestException if any validation fails
	 */
	validateKeyBundle(
		identityKey: string,
		signedPreKey: SignedPreKeyDto,
		preKeys: PreKeyDto[],
	): void {
		this.logger.debug('Validating complete key bundle');

		this.validateIdentityKey(identityKey);
		this.validateSignedPreKey(signedPreKey);
		this.validatePreKeys(preKeys);

		this.logger.debug('Key bundle validation successful');
	}

	/**
	 * Check if a signed prekey is expired
	 * 
	 * @param expiresAt - The expiration date
	 * @returns true if the key is expired
	 */
	isSignedPreKeyExpired(expiresAt: Date): boolean {
		return new Date() > expiresAt;
	}
}
