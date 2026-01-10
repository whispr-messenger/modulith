import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeviceRepository } from '../../repositories/device.repository';

@Injectable()
export class DeviceActivityService {
	private readonly logger = new Logger(DeviceActivityService.name);

	constructor(private readonly deviceRepository: DeviceRepository) { }

	async updateLastActive(deviceId: string): Promise<void> {
		const result = await this.deviceRepository.update(
			{ id: deviceId },
			{ lastActive: new Date() },
		);

		if (result.affected === 0) {
			this.logger.warn(`Device not found for activity update: ${deviceId}`);
			throw new NotFoundException('Device not found');
		}

		this.logger.debug(`Activity updated for device: ${deviceId}`);
	}

	async updateFCMToken(deviceId: string, fcmToken: string): Promise<void> {
		const result = await this.deviceRepository.update(
			{ id: deviceId },
			{
				fcmToken,
				lastActive: new Date(),
			},
		);

		if (result.affected === 0) {
			this.logger.warn(`Device not found for FCM token update: ${deviceId}`);
			throw new NotFoundException('Device not found');
		}

		this.logger.log(`FCM token updated for device: ${deviceId}`);
	}

	async getActiveDevices(userId: string, daysThreshold: number = 30) {
		return this.deviceRepository.findActiveDevices(userId, daysThreshold);
	}
}
