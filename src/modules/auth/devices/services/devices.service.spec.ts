import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from '../entities/device.entity';
import { DeviceRepository } from '../repositories/device.repository';

describe('DevicesService', () => {
	let service: DevicesService;
	let deviceRepository: jest.Mocked<DeviceRepository>;

	const mockDevice = {
		id: 'device-123',
		userId: 'user-123',
		deviceName: 'iPhone 13',
		deviceType: 'ios',
		deviceFingerprint: 'fingerprint-123',
		model: 'iPhone 13 Pro',
		osVersion: 'iOS 17.0',
		appVersion: '1.0.0',
		fcmToken: null as any,
		apnsToken: 'apns-token-123',
		publicKey: 'public-key-123',
		lastActive: new Date('2026-01-09T10:00:00Z'),
		ipAddress: '192.168.1.1',
		isVerified: true,
		isActive: true,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-09T10:00:00Z'),
		user: null as any,
	} as Device;

	const mockDeviceRepository = {
		find: jest.fn(),
		findOne: jest.fn(),
		findVerifiedByUserId: jest.fn(),
		findByUserIdAndDeviceId: jest.fn(),
		remove: jest.fn(),
		save: jest.fn(),
		create: jest.fn(),
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DevicesService,
				{
					provide: DeviceRepository,
					useValue: mockDeviceRepository,
				},
			],
		}).compile();

		service = module.get<DevicesService>(DevicesService);
		deviceRepository = module.get(DeviceRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getUserDevices', () => {
		it('should return all devices for a user ordered by lastActive DESC', async () => {
			const device1 = { ...mockDevice, id: 'device-1', lastActive: new Date('2026-01-09T10:00:00Z') };
			const device2 = { ...mockDevice, id: 'device-2', lastActive: new Date('2026-01-08T10:00:00Z') };
			const device3 = { ...mockDevice, id: 'device-3', lastActive: new Date('2026-01-07T10:00:00Z') };
			const mockDevices = [device1, device2, device3];

			deviceRepository.find.mockResolvedValue(mockDevices);

			const result = await service.getUserDevices('user-123');

			expect(result).toEqual(mockDevices);
			expect(deviceRepository.find).toHaveBeenCalledWith({
				where: { userId: 'user-123' },
				order: { lastActive: 'DESC' },
			});
			expect(result).toHaveLength(3);
		});

		it('should return empty array when user has no devices', async () => {
			deviceRepository.find.mockResolvedValue([]);

			const result = await service.getUserDevices('user-without-devices');

			expect(result).toEqual([]);
			expect(deviceRepository.find).toHaveBeenCalledWith({
				where: { userId: 'user-without-devices' },
				order: { lastActive: 'DESC' },
			});
		});

		it('should return single device for user with one device', async () => {
			const singleDevice = [mockDevice];
			deviceRepository.find.mockResolvedValue(singleDevice);

			const result = await service.getUserDevices('user-123');

			expect(result).toEqual(singleDevice);
			expect(result).toHaveLength(1);
		});

		it('should include both verified and unverified devices', async () => {
			const verifiedDevice = { ...mockDevice, id: 'device-1', isVerified: true };
			const unverifiedDevice = { ...mockDevice, id: 'device-2', isVerified: false };
			const mixedDevices = [verifiedDevice, unverifiedDevice];

			deviceRepository.find.mockResolvedValue(mixedDevices);

			const result = await service.getUserDevices('user-123');

			expect(result).toEqual(mixedDevices);
			expect(result).toHaveLength(2);
			expect(result.some(d => d.isVerified)).toBe(true);
			expect(result.some(d => !d.isVerified)).toBe(true);
		});
	});

	describe('getVerifiedDevices', () => {
		it('should return only verified devices', async () => {
			const verifiedDevice1 = { ...mockDevice, id: 'device-1', isVerified: true };
			const verifiedDevice2 = { ...mockDevice, id: 'device-2', isVerified: true };
			const verifiedDevices = [verifiedDevice1, verifiedDevice2];

			deviceRepository.findVerifiedByUserId.mockResolvedValue(verifiedDevices);

			const result = await service.getVerifiedDevices('user-123');

			expect(result).toEqual(verifiedDevices);
			expect(deviceRepository.findVerifiedByUserId).toHaveBeenCalledWith('user-123');
			expect(result.every(d => d.isVerified)).toBe(true);
		});

		it('should return empty array when no verified devices exist', async () => {
			deviceRepository.findVerifiedByUserId.mockResolvedValue([]);

			const result = await service.getVerifiedDevices('user-123');

			expect(result).toEqual([]);
			expect(deviceRepository.findVerifiedByUserId).toHaveBeenCalledWith('user-123');
		});

		it('should return all devices when all are verified', async () => {
			const allVerified = [
				{ ...mockDevice, id: 'device-1', isVerified: true },
				{ ...mockDevice, id: 'device-2', isVerified: true },
				{ ...mockDevice, id: 'device-3', isVerified: true },
			];
			deviceRepository.findVerifiedByUserId.mockResolvedValue(allVerified);

			const result = await service.getVerifiedDevices('user-123');

			expect(result).toEqual(allVerified);
			expect(result).toHaveLength(3);
			expect(result.every(d => d.isVerified)).toBe(true);
		});

		it('should return empty array when user has no devices', async () => {
			deviceRepository.findVerifiedByUserId.mockResolvedValue([]);

			const result = await service.getVerifiedDevices('user-without-devices');

			expect(result).toEqual([]);
		});
	});

	describe('getDevice', () => {
		it('should return device when it exists', async () => {
			deviceRepository.findOne.mockResolvedValue(mockDevice);

			const result = await service.getDevice('device-123');

			expect(result).toEqual(mockDevice);
			expect(deviceRepository.findOne).toHaveBeenCalledWith({
				where: { id: 'device-123' },
			});
		});

		it('should throw NotFoundException when device does not exist', async () => {
			deviceRepository.findOne.mockResolvedValue(null);

			await expect(service.getDevice('non-existent-device'))
				.rejects
				.toThrow(NotFoundException);

			await expect(service.getDevice('non-existent-device'))
				.rejects
				.toThrow('Device not found');
		});

		it('should return device with all properties', async () => {
			const completeDevice = { ...mockDevice };
			deviceRepository.findOne.mockResolvedValue(completeDevice);

			const result = await service.getDevice('device-123');

			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('userId');
			expect(result).toHaveProperty('deviceName');
			expect(result).toHaveProperty('deviceType');
			expect(result).toHaveProperty('deviceFingerprint');
			expect(result).toHaveProperty('publicKey');
			expect(result).toHaveProperty('lastActive');
			expect(result).toHaveProperty('isVerified');
			expect(result).toHaveProperty('isActive');
		});
	});

	describe('revokeDevice', () => {
		it('should successfully revoke user device', async () => {
			deviceRepository.findByUserIdAndDeviceId.mockResolvedValue(mockDevice);
			deviceRepository.remove.mockResolvedValue(mockDevice);

			await service.revokeDevice('user-123', 'device-123');

			expect(deviceRepository.findByUserIdAndDeviceId).toHaveBeenCalledWith('user-123', 'device-123');
			expect(deviceRepository.remove).toHaveBeenCalledWith(mockDevice);
		});

		it('should call repository.remove with correct device', async () => {
			const specificDevice = { ...mockDevice, id: 'specific-device' };
			deviceRepository.findByUserIdAndDeviceId.mockResolvedValue(specificDevice);
			deviceRepository.remove.mockResolvedValue(specificDevice);

			await service.revokeDevice('user-123', 'specific-device');

			expect(deviceRepository.remove).toHaveBeenCalledTimes(1);
			expect(deviceRepository.remove).toHaveBeenCalledWith(specificDevice);
		});

		it('should log revocation message', async () => {
			deviceRepository.findByUserIdAndDeviceId.mockResolvedValue(mockDevice);
			deviceRepository.remove.mockResolvedValue(mockDevice);

			const loggerSpy = jest.spyOn((service as any).logger, 'log');

			await service.revokeDevice('user-123', 'device-123');

			expect(loggerSpy).toHaveBeenCalledWith('Device revoked: device-123 for user: user-123');
		});

		it('should throw NotFoundException when device does not exist', async () => {
			deviceRepository.findByUserIdAndDeviceId.mockResolvedValue(null);

			await expect(service.revokeDevice('user-123', 'non-existent-device'))
				.rejects
				.toThrow(NotFoundException);

			await expect(service.revokeDevice('user-123', 'non-existent-device'))
				.rejects
				.toThrow('Device not found');

			expect(deviceRepository.remove).not.toHaveBeenCalled();
		});

		it('should throw NotFoundException when device belongs to another user', async () => {
			deviceRepository.findByUserIdAndDeviceId.mockResolvedValue(null);

			await expect(service.revokeDevice('user-456', 'device-123'))
				.rejects
				.toThrow(NotFoundException);

			expect(deviceRepository.remove).not.toHaveBeenCalled();
		});
	});
});
