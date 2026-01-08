import { Injectable, Logger } from '@nestjs/common';
import { DeviceRepository } from '../repositories/device.repository';

export interface DeviceStats {
	total: number;
	active: number;
	activePercentage: number;
}

@Injectable()
export class DeviceStatsService {
	private readonly logger = new Logger(DeviceStatsService.name);
	private readonly DEFAULT_ACTIVE_DAYS_THRESHOLD = 30;

	constructor(private readonly deviceRepository: DeviceRepository) {}

	async getDeviceStats(
		userId: string,
		daysThreshold: number = this.DEFAULT_ACTIVE_DAYS_THRESHOLD,
	): Promise<DeviceStats> {
		const [total, active] = await Promise.all([
			this.deviceRepository.countVerifiedDevices(userId),
			this.deviceRepository.countActiveDevices(userId, daysThreshold),
		]);

		const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

		this.logger.debug(
			`Statistics for user ${userId}: ${active}/${total} active (${activePercentage}%)`,
		);

		return {
			total,
			active,
			activePercentage,
		};
	}

	async getDetailedStats(userId: string) {
		const devices = await this.deviceRepository.findVerifiedByUserId(userId);

		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		return {
			total: devices.length,
			activeLastWeek: devices.filter((d) => d.lastActive >= sevenDaysAgo).length,
			activeLastMonth: devices.filter((d) => d.lastActive >= thirtyDaysAgo).length,
			byDeviceType: this.groupByDeviceType(devices),
		};
	}

	private groupByDeviceType(devices: any[]) {
		return devices.reduce(
			(acc, device) => {
				acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);
	}
}
