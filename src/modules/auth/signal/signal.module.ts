import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

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
	SignalKeySchedulerService,
} from './services';

// Controllers
import {
	SignalKeysController,
	SignalKeysManagementController,
	SignalKeysHealthController,
} from './controllers';

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
		// Enable scheduled tasks (cron jobs)
		ScheduleModule.forRoot(),
	],
	controllers: [
		// Public endpoints for key retrieval
		SignalKeysController,
		// Protected endpoints for key management
		SignalKeysManagementController,
		// Health check and monitoring
		SignalKeysHealthController,
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
		SignalKeySchedulerService,
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
		SignalKeySchedulerService,
	],
})
export class SignalModule {}
