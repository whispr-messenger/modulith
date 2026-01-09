import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { DeviceRegistrationData } from '../types/device-registration-data.interface';

@Injectable()
export class DevicesService {
	constructor(
		@InjectRepository(Device)
		private readonly deviceRepository: Repository<Device>
	) { }

	async registerDevice(data: DeviceRegistrationData): Promise<Device> {
		const existingDevice = await this.deviceRepository.findOne({
			where: {
				userId: data.userId,
				deviceName: data.deviceName,
				deviceType: data.deviceType,
			},
		});

		if (existingDevice) {
			existingDevice.publicKey = data.publicKey;
			existingDevice.ipAddress = data.ipAddress || '';
			existingDevice.fcmToken = data.fcmToken || '';
			existingDevice.lastActive = new Date();
			existingDevice.isVerified = true;
			return this.deviceRepository.save(existingDevice);
		}

		const device = this.deviceRepository.create({
			userId: data.userId,
			deviceName: data.deviceName,
			deviceType: data.deviceType,
			publicKey: data.publicKey,
			ipAddress: data.ipAddress,
			fcmToken: data.fcmToken,
			isVerified: true,
			lastActive: new Date(),
		});

		return this.deviceRepository.save(device);
	}

	async getUserDevices(userId: string): Promise<Device[]> {
		return this.deviceRepository.find({
			where: { userId },
			order: { lastActive: 'DESC' },
		});
	}

	async getDevice(deviceId: string): Promise<Device> {
		const device = await this.deviceRepository.findOne({
			where: { id: deviceId },
		});
		if (!device) {
			throw new NotFoundException('Appareil non trouvé');
		}
		return device;
	}

	async updateLastActive(deviceId: string): Promise<void> {
		await this.deviceRepository.update({ id: deviceId }, { lastActive: new Date() });
	}

	async revokeDevice(userId: string, deviceId: string): Promise<void> {
		const device = await this.deviceRepository.findOne({
			where: { id: deviceId, userId },
		});

		if (!device) {
			throw new NotFoundException('Appareil non trouvé');
		}

		await this.deviceRepository.remove(device);
	}

	async updateFCMToken(deviceId: string, fcmToken: string): Promise<void> {
		await this.deviceRepository.update({ id: deviceId }, { fcmToken, lastActive: new Date() });
	}

	async getDevicesByUserId(userId: string): Promise<Device[]> {
		return this.deviceRepository.find({
			where: { userId, isVerified: true },
			order: { lastActive: 'DESC' },
		});
	}

	async verifyDevice(deviceId: string): Promise<void> {
		await this.deviceRepository.update({ id: deviceId }, { isVerified: true });
	}

	async getDeviceStats(userId: string): Promise<{ total: number; active: number }> {
		const total = await this.deviceRepository.count({
			where: { userId, isVerified: true },
		});

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const active = await this.deviceRepository.count({
			where: {
				userId,
				isVerified: true,
				lastActive: { $gte: thirtyDaysAgo } as any,
			},
		});

		return { total, active };
	}
}
