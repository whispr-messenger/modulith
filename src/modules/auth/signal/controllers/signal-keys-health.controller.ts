import { Controller, Get, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SignalKeySchedulerService } from '../services/signal-key-scheduler.service';
import { SignalKeyRotationService } from '../services/signal-key-rotation.service';
import { PreKeyRepository } from '../repositories';
import {
	SIGNAL_HEALTH_STATUS_SCHEMA,
	SIGNAL_HEALTH_STATUS_EXAMPLES,
	CLEANUP_RESULT_SCHEMA,
	CLEANUP_RESULT_EXAMPLES,
} from '../swagger/signal-keys-health.schemas';
import { SignalHealthStatusDto, CleanupResultDto } from '../dto';

/**
 * Health check and monitoring endpoint for Signal Protocol keys
 * 
 * Provides operational visibility into:
 * - Scheduler job execution status
 * - System-wide prekey availability
 * - Key rotation status
 */
@ApiTags('Signal Protocol - Health & Monitoring')
@Controller('signal/health')
export class SignalKeysHealthController {
	private readonly logger = new Logger(SignalKeysHealthController.name);

	constructor(
		private readonly schedulerService: SignalKeySchedulerService,
		private readonly preKeyRepository: PreKeyRepository,
	) { }

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
		type: SignalHealthStatusDto,
		schema: SIGNAL_HEALTH_STATUS_SCHEMA,
		examples: SIGNAL_HEALTH_STATUS_EXAMPLES,
	})
	async getHealth(): Promise<SignalHealthStatusDto> {
		this.logger.debug('Health check requested');

		const schedulerStats = this.schedulerService.getSchedulerStats();

		// Get prekey statistics
		const totalUnused = await this.preKeyRepository.count({
			where: { isUsed: false },
		});

		const devicesGrouped = await this.preKeyRepository
			.createQueryBuilder('prekey')
			.select('prekey.userId', 'userId')
			.addSelect('prekey.deviceId', 'deviceId')
			.addSelect('COUNT(*)', 'count')
			.where('prekey.isUsed = false')
			.groupBy('prekey.userId')
			.addGroupBy('prekey.deviceId')
			.getRawMany();

		const devicesWithLowPrekeys = devicesGrouped.filter(
			(d) => parseInt(d.count, 10) < 20,
		).length;

		const devicesWithNoPrekeys = devicesGrouped.filter(
			(d) => parseInt(d.count, 10) === 0,
		).length;

		// Determine overall health status
		const issues: string[] = [];

		if (!schedulerStats.isHealthy) {
			issues.push('Scheduler jobs not running as expected');
		}

		if (devicesWithNoPrekeys > 0) {
			issues.push(
				`${devicesWithNoPrekeys} devices have no available prekeys (cannot initiate conversations)`,
			);
		}

		if (devicesWithLowPrekeys > 10) {
			issues.push(
				`${devicesWithLowPrekeys} devices have low prekey counts (< 20)`,
			);
		}

		if (totalUnused < 1000) {
			issues.push(
				`System-wide prekey count is low (${totalUnused} total unused)`,
			);
		}

		let status: 'healthy' | 'degraded' | 'unhealthy';
		if (devicesWithNoPrekeys > 0 || !schedulerStats.isHealthy) {
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
				devicesWithLowPrekeys,
				devicesWithNoPrekeys,
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
		type: CleanupResultDto,
		schema: CLEANUP_RESULT_SCHEMA,
		examples: CLEANUP_RESULT_EXAMPLES,
	})
	async triggerManualCleanup(): Promise<CleanupResultDto> {
		this.logger.log('Manual cleanup triggered via API');

		const result = await this.schedulerService.manualCleanup();

		return {
			message: 'Cleanup completed successfully',
			...result,
		};
	}
}
