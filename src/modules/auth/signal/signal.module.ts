import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { IdentityKey, SignedPreKey, PreKey } from './entities';

// Repositories
import {
	IdentityKeyRepository,
	SignedPreKeyRepository,
	PreKeyRepository,
} from './repositories';

// Services
import {
	SignalKeyStorageService,
	SignalPreKeyBundleService,
	SignalKeyRotationService,
	SignalKeyValidationService,
} from './services';

// Controllers
import { SignalKeysController, SignalKeysManagementController } from './controllers';

/**
 * Signal Protocol Module
 * 
 * This module provides complete Signal Protocol key management functionality:
 * - Identity Key storage and retrieval
 * - Signed PreKey management with automatic expiration
 * - PreKey (one-time keys) management and consumption
 * - Support for X3DH key exchange protocol
 * - Public endpoints for key bundle retrieval
 * - Key rotation and validation services
 * 
 * The module is designed to be imported by other authentication modules
 * that need to handle end-to-end encryption key management.
 */
@Module({
	imports: [
		// Register TypeORM entities for Signal Protocol keys
		TypeOrmModule.forFeature([IdentityKey, SignedPreKey, PreKey]),
	],
	controllers: [
		// Public endpoints for key retrieval
		SignalKeysController,
		// Protected endpoints for key management
		SignalKeysManagementController,
	],
	providers: [
		// Custom repositories
		IdentityKeyRepository,
		SignedPreKeyRepository,
		PreKeyRepository,
		// Services
		SignalKeyStorageService,
		SignalPreKeyBundleService,
		SignalKeyRotationService,
		SignalKeyValidationService,
	],
	exports: [
		// Export repositories for direct access if needed
		IdentityKeyRepository,
		SignedPreKeyRepository,
		PreKeyRepository,
		// Export services for use in other modules
		SignalKeyStorageService,
		SignalPreKeyBundleService,
		SignalKeyRotationService,
		SignalKeyValidationService,
	],
})
export class SignalModule {}
