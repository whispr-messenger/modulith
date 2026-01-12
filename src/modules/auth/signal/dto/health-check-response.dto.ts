import { ApiProperty } from '@nestjs/swagger';

/**
 * Scheduler statistics DTO
 */
export class SchedulerStatsDto {
	@ApiProperty({
		description: 'Whether all scheduled jobs are running as expected',
		example: true,
	})
	isHealthy: boolean;

	@ApiProperty({
		description: 'Last time the cleanup job ran',
		example: '2026-01-08T14:00:00Z',
		nullable: true,
	})
	lastCleanupTime: Date | null;

	@ApiProperty({
		description: 'Last time the prekey check job ran',
		example: '2026-01-08T14:15:00Z',
		nullable: true,
	})
	lastPreKeyCheckTime: Date | null;

	@ApiProperty({
		description: 'Last time the old prekey cleanup job ran',
		example: '2026-01-08T14:20:00Z',
		nullable: true,
	})
	lastOldPreKeyCleanupTime: Date | null;
}

/**
 * PreKey statistics DTO
 */
export class PreKeyStatsDto {
	@ApiProperty({
		description: 'Total number of unused prekeys across all devices',
		example: 5420,
	})
	totalUnused: number;

	@ApiProperty({
		description: 'Number of devices with less than 20 available prekeys',
		example: 2,
	})
	devicesWithLowPrekeys: number;

	@ApiProperty({
		description: 'Number of devices with zero available prekeys (critical)',
		example: 0,
	})
	devicesWithNoPrekeys: number;
}

/**
 * Response DTO for Signal health check
 */
export class SignalHealthStatusDto {
	@ApiProperty({
		description: 'Overall health status of the Signal key management system',
		enum: ['healthy', 'degraded', 'unhealthy'],
		example: 'healthy',
	})
	status: 'healthy' | 'degraded' | 'unhealthy';

	@ApiProperty({
		description: 'Timestamp of the health check',
		example: '2026-01-08T14:30:00Z',
	})
	timestamp: Date;

	@ApiProperty({
		description: 'Scheduler job execution status',
		type: SchedulerStatsDto,
	})
	scheduler: SchedulerStatsDto;

	@ApiProperty({
		description: 'System-wide prekey statistics',
		type: PreKeyStatsDto,
	})
	prekeys: PreKeyStatsDto;

	@ApiProperty({
		description: 'List of detected issues with the system',
		type: [String],
		example: [],
	})
	issues: string[];
}
