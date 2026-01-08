import { Controller, Get, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SignalKeySchedulerService } from '../services/signal-key-scheduler.service';
import { SignalKeyRotationService } from '../services/signal-key-rotation.service';
import { PreKeyRepository } from '../repositories';

/**
 * Health check and monitoring endpoint for Signal Protocol keys
 * 
 * Provides operational visibility into:
 * - Scheduler job execution status
 * - System-wide prekey availability
 * - Key rotation status
 */
@ApiTags('Signal Protocol - Health & Monitoring')
@Controller('api/v1/signal/health')
export class SignalKeysHealthController {
	private readonly logger = new Logger(SignalKeysHealthController.name);

	constructor(
		private readonly schedulerService: SignalKeySchedulerService,
		private readonly rotationService: SignalKeyRotationService,
		private readonly preKeyRepository: PreKeyRepository,
	) {}

	/**
	 * GET /api/v1/signal/health
	 * 
	 * Get overall health status of Signal key management system
	 */
	@Get()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Get Signal keys health status',
		description:
			'Returns comprehensive health information about the Signal Protocol key management system',
	})
	@ApiResponse({
		status: 200,
		description: 'Health status retrieved successfully',
		schema: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					enum: ['healthy', 'degraded', 'unhealthy'],
					example: 'healthy',
				},
				timestamp: {
					type: 'string',
					format: 'date-time',
					example: '2026-01-08T14:30:00Z',
				},
				scheduler: {
					type: 'object',
					properties: {
						isHealthy: { type: 'boolean', example: true },
						lastCleanupTime: {
							type: 'string',
							format: 'date-time',
							nullable: true,
						},
						lastPreKeyCheckTime: {
							type: 'string',
							format: 'date-time',
							nullable: true,
						},
						lastOldPreKeyCleanupTime: {
							type: 'string',
							format: 'date-time',
							nullable: true,
						},
					},
				},
				prekeys: {
					type: 'object',
					properties: {
						totalUnused: { type: 'number', example: 5420 },
						usersWithLowPrekeys: { type: 'number', example: 2 },
						usersWithNoPrekeys: { type: 'number', example: 0 },
					},
				},
				issues: {
					type: 'array',
					items: { type: 'string' },
					example: [],
				},
			},
		},
	})
	async getHealth(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy';
		timestamp: Date;
		scheduler: ReturnType<SignalKeySchedulerService['getSchedulerStats']>;
		prekeys: {
			totalUnused: number;
			usersWithLowPrekeys: number;
			usersWithNoPrekeys: number;
		};
		issues: string[];
	}> {
		this.logger.debug('Health check requested');

		const schedulerStats = this.schedulerService.getSchedulerStats();

		// Get prekey statistics
		const totalUnused = await this.preKeyRepository.count({
			where: { isUsed: false },
		});

		const usersGrouped = await this.preKeyRepository
			.createQueryBuilder('prekey')
			.select('prekey.userId', 'userId')
			.addSelect('COUNT(*)', 'count')
			.where('prekey.isUsed = false')
			.groupBy('prekey.userId')
			.getRawMany();

		const usersWithLowPrekeys = usersGrouped.filter(
			(u) => parseInt(u.count, 10) < 20,
		).length;

		const usersWithNoPrekeys = usersGrouped.filter(
			(u) => parseInt(u.count, 10) === 0,
		).length;

		// Determine overall health status
		const issues: string[] = [];

		if (!schedulerStats.isHealthy) {
			issues.push('Scheduler jobs not running as expected');
		}

		if (usersWithNoPrekeys > 0) {
			issues.push(
				`${usersWithNoPrekeys} users have no available prekeys (cannot initiate conversations)`,
			);
		}

		if (usersWithLowPrekeys > 10) {
			issues.push(
				`${usersWithLowPrekeys} users have low prekey counts (< 20)`,
			);
		}

		if (totalUnused < 1000) {
			issues.push(
				`System-wide prekey count is low (${totalUnused} total unused)`,
			);
		}

		let status: 'healthy' | 'degraded' | 'unhealthy';
		if (usersWithNoPrekeys > 0 || !schedulerStats.isHealthy) {
			status = 'unhealthy';
		} else if (issues.length > 0) {
			status = 'degraded';
		} else {
			status = 'healthy';
		}

		this.logger.log(`Health check completed: ${status} (${issues.length} issues)`);

		return {
			status,
			timestamp: new Date(),
			scheduler: schedulerStats,
			prekeys: {
				totalUnused,
				usersWithLowPrekeys,
				usersWithNoPrekeys,
			},
			issues,
		};
	}

	/**
	 * POST /api/v1/signal/health/cleanup
	 * 
	 * Manually trigger cleanup operations (for admin use)
	 */
	@Post('cleanup')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Manually trigger cleanup',
		description:
			'Triggers manual cleanup of expired keys and old prekeys. Useful for testing or immediate cleanup needs.',
	})
	@ApiResponse({
		status: 200,
		description: 'Cleanup completed successfully',
		schema: {
			type: 'object',
			properties: {
				message: { type: 'string', example: 'Cleanup completed successfully' },
				expiredKeysDeleted: { type: 'number', example: 5 },
				oldPreKeysDeleted: { type: 'number', example: 23 },
			},
		},
	})
	async triggerManualCleanup(): Promise<{
		message: string;
		expiredKeysDeleted: number;
		oldPreKeysDeleted: number;
	}> {
		this.logger.log('Manual cleanup triggered via API');

		const result = await this.schedulerService.manualCleanup();

		return {
			message: 'Cleanup completed successfully',
			...result,
		};
	}
}
