import { Injectable } from '@nestjs/common';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { Device } from '../entities/device.entity';

@Injectable()
export class DeviceRepository extends Repository<Device> {
    constructor(private dataSource: DataSource) {
        super(Device, dataSource.createEntityManager());
    }

    async findByUserAndFingerprint(
        userId: string,
        deviceName: string,
        deviceType: string,
    ): Promise<Device | null> {
        return this.findOne({
            where: {
                userId,
                deviceName,
                deviceType,
            },
        });
    }

    async findVerifiedByUserId(userId: string): Promise<Device[]> {
        return this.find({
            where: { userId, isVerified: true },
            order: { lastActive: 'DESC' },
        });
    }

    async findActiveDevices(userId: string, daysThreshold: number): Promise<Device[]> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

        return this.find({
            where: {
                userId,
                isVerified: true,
                lastActive: MoreThan(thresholdDate),
            },
            order: { lastActive: 'DESC' },
        });
    }

    async countVerifiedDevices(userId: string): Promise<number> {
        return this.count({
            where: { userId, isVerified: true },
        });
    }

    async countActiveDevices(userId: string, daysThreshold: number): Promise<number> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

        return this.count({
            where: {
                userId,
                isVerified: true,
                lastActive: MoreThan(thresholdDate),
            },
        });
    }

    async findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<Device | null> {
        return this.findOne({
            where: { id: deviceId, userId },
        });
    }
}
