import { VerificationCode } from '../types/verification-code.interface';

/**
 * Repository interface for verification operations.
 * Abstracts the storage layer for verification data.
 * This allows switching between different storage implementations (cache, database, etc.)
 * without changing the business logic.
 */
export interface VerificationRepository {
	/**
	 * Saves a verification record.
	 * @param id - Unique identifier for the verification
	 * @param data - Verification data to store
	 * @param ttl - Time to live in milliseconds
	 */
	save(id: string, data: VerificationCode, ttl: number): Promise<void>;

	/**
	 * Finds a verification record by ID.
	 * @param id - Unique identifier for the verification
	 * @returns The verification data if found, null otherwise
	 */
	findById(id: string): Promise<VerificationCode | null>;

	/**
	 * Updates an existing verification record.
	 * @param id - Unique identifier for the verification
	 * @param data - Updated verification data
	 * @param ttl - Time to live in milliseconds
	 */
	update(id: string, data: VerificationCode, ttl: number): Promise<void>;

	/**
	 * Deletes a verification record.
	 * @param id - Unique identifier for the verification
	 */
	delete(id: string): Promise<void>;
}
