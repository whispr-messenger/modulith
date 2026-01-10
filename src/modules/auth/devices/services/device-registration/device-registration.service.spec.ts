import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DataSource, EntityManager, UpdateResult } from 'typeorm';
import { DeviceRegistrationService } from '../device-registration.service';
import { DeviceRepository } from '../../repositories/device.repository';
import { Device } from '../../entities/device.entity';
import { DeviceRegistrationData } from '../types/device-registration-data.interface';

describe('DeviceRegistrationService', () => {
	let service: DeviceRegistrationService;
	let deviceRepository: jest.Mocked<DeviceRepository>;
	let dataSource: jest.Mocked<DataSource>;
	let entityManager: jest.Mocked<EntityManager>;
	let transactionRepository: jest.Mocked<DeviceRepository>;

	// Fixtures
	const createDeviceFixture = (overrides: Partial<Device> = {}): Device => ({
		id: 'device-uuid-123',
		userId: 'user-123',
		deviceName: 'iPhone 14',
		deviceType: 'mobile',
		deviceFingerprint: 'fingerprint-123',
		model: 'iPhone 14 Pro',
		osVersion: 'iOS 17.0',
		appVersion: '1.0.0',
		publicKey: 'public-key-abc',
		ipAddress: '192.168.1.100',
		fcmToken: 'fcm-token-xyz',
		apnsToken: null,
		lastActive: new Date('2026-01-09T10:00:00Z'),
		isVerified: true,
		isActive: true,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-09T10:00:00Z'),
		user: null,
		...overrides,
	}) as Device;

	const createRegistrationDataFixture = (
		overrides: Partial<DeviceRegistrationData> = {},
	): DeviceRegistrationData => ({
		userId: 'user-123',
		deviceName: 'iPhone 14',
		deviceType: 'mobile',
		publicKey: 'public-key-abc',
		ipAddress: '192.168.1.100',
		fcmToken: 'fcm-token-xyz',
		...overrides,
	});

	beforeEach(async () => {
		// Mock repository
		const mockDeviceRepository = {
			findByUserAndFingerprint: jest.fn(),
			create: jest.fn(),
			save: jest.fn(),
			update: jest.fn(),
		};

		// Mock transaction repository
		transactionRepository = {
			...mockDeviceRepository,
		} as any;

		// Mock entity manager
		entityManager = {
			withRepository: jest.fn().mockReturnValue(transactionRepository),
		} as any;

		// Mock data source
		dataSource = {
			transaction: jest.fn(),
		} as any;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DeviceRegistrationService,
				{
					provide: DeviceRepository,
					useValue: mockDeviceRepository,
				},
				{
					provide: DataSource,
					useValue: dataSource,
				},
			],
		}).compile();

		service = module.get<DeviceRegistrationService>(DeviceRegistrationService);
		deviceRepository = module.get(DeviceRepository);

		// Mock logger
		jest.spyOn(Logger.prototype, 'log').mockImplementation();
		jest.spyOn(Logger.prototype, 'warn').mockImplementation();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('registerDevice', () => {
		describe('Creation of a new device', () => {
			it('should create a new device with all provided data', async () => {
				const registrationData = createRegistrationDataFixture();
				const expectedDevice = createDeviceFixture();

				// Mock: aucun appareil existant
				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				// Mock transaction
				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				// Assertions
				expect(result).toBeDefined();
				expect(result.id).toBe('device-uuid-123');
				expect(result.userId).toBe(registrationData.userId);
				expect(result.deviceName).toBe(registrationData.deviceName);
				expect(result.deviceType).toBe(registrationData.deviceType);
				expect(result.publicKey).toBe(registrationData.publicKey);
				expect(result.ipAddress).toBe(registrationData.ipAddress);
				expect(result.fcmToken).toBe(registrationData.fcmToken);
				expect(result.isVerified).toBe(true);

				// Vérifier les appels
				expect(dataSource.transaction).toHaveBeenCalledTimes(1);
				expect(entityManager.withRepository).toHaveBeenCalledWith(deviceRepository);
				expect(transactionRepository.findByUserAndFingerprint).toHaveBeenCalledWith(
					registrationData.userId,
					registrationData.deviceName,
					registrationData.deviceType,
				);
				expect(transactionRepository.create).toHaveBeenCalled();
				expect(transactionRepository.save).toHaveBeenCalledWith(expectedDevice);
			});

			it('should create a device with default values for optional fields', async () => {
				const registrationData = createRegistrationDataFixture({
					ipAddress: undefined,
					fcmToken: undefined,
				});
				const expectedDevice = createDeviceFixture({
					ipAddress: undefined,
					fcmToken: undefined,
				});

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				// Vérifier que create a été appelé avec les bonnes valeurs
				expect(transactionRepository.create).toHaveBeenCalledWith({
					userId: registrationData.userId,
					deviceName: registrationData.deviceName,
					deviceType: registrationData.deviceType,
					publicKey: registrationData.publicKey,
					ipAddress: undefined,
					fcmToken: undefined,
					isVerified: true,
					lastActive: expect.any(Date),
				});
			});

			it('should log the creation of a new device', async () => {
				const registrationData = createRegistrationDataFixture();
				const expectedDevice = createDeviceFixture();

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await service.registerDevice(registrationData);

				expect(Logger.prototype.log).toHaveBeenCalledWith(
					`Registering new device for user: ${registrationData.userId}`,
				);
			});

			it('should set lastActive to current date', async () => {
				const now = new Date('2026-01-09T12:00:00Z');
				jest.useFakeTimers();
				jest.setSystemTime(now);

				const registrationData = createRegistrationDataFixture();
				const expectedDevice = createDeviceFixture({ lastActive: now });

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				expect(transactionRepository.create).toHaveBeenCalledWith(
					expect.objectContaining({
						lastActive: expect.any(Date),
					}),
				);

				// Vérifier que lastActive est proche de maintenant (< 1 seconde)
				const lastActiveTime = new Date(result.lastActive).getTime();
				const expectedTime = now.getTime();
				expect(Math.abs(lastActiveTime - expectedTime)).toBeLessThan(1000);

				jest.useRealTimers();
			});
		});

		describe('Update of an existing device', () => {
			it('should update an existing device', async () => {
				const existingDevice = createDeviceFixture({
					id: 'existing-device-id',
					publicKey: 'old-public-key',
					ipAddress: '192.168.1.50',
					fcmToken: 'old-fcm-token',
					lastActive: new Date('2025-01-01T00:00:00Z'),
				});

				const registrationData = createRegistrationDataFixture({
					publicKey: 'new-public-key',
					ipAddress: '192.168.1.200',
					fcmToken: 'new-fcm-token',
				});

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(existingDevice);
				transactionRepository.save.mockImplementation(async (device) => device as Device);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				// Vérifier que l'ID reste le même
				expect(result.id).toBe('existing-device-id');

				// Vérifier les mises à jour
				expect(result.publicKey).toBe('new-public-key');
				expect(result.ipAddress).toBe('192.168.1.200');
				expect(result.fcmToken).toBe('new-fcm-token');
				expect(result.isVerified).toBe(true);

				// Vérifier que save a été appelé
				expect(transactionRepository.save).toHaveBeenCalledWith(existingDevice);
			});

			it('should update lastActive to current date', async () => {
				const now = new Date('2026-01-09T12:00:00Z');
				jest.useFakeTimers();
				jest.setSystemTime(now);

				const existingDevice = createDeviceFixture({
					lastActive: new Date('2025-01-01T00:00:00Z'),
				});

				const registrationData = createRegistrationDataFixture();

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(existingDevice);
				transactionRepository.save.mockImplementation(async (device) => device as Device);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				// Vérifier que lastActive a été mis à jour
				const lastActiveTime = new Date(result.lastActive).getTime();
				const expectedTime = now.getTime();
				expect(Math.abs(lastActiveTime - expectedTime)).toBeLessThan(1000);
				expect(result.lastActive.getTime()).toBeGreaterThan(
					new Date('2025-01-01T00:00:00Z').getTime(),
				);

				jest.useRealTimers();
			});

			it('should update with empty optional fields if absent', async () => {
				const existingDevice = createDeviceFixture({
					ipAddress: '192.168.1.50',
					fcmToken: 'old-token',
				});

				const registrationData = createRegistrationDataFixture({
					ipAddress: undefined,
					fcmToken: undefined,
				});

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(existingDevice);
				transactionRepository.save.mockImplementation(async (device) => device as Device);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				// Vérifier que les champs optionnels sont définis à ''
				expect(result.ipAddress).toBe('');
				expect(result.fcmToken).toBe('');
			});

			it('should log device update', async () => {
				const existingDevice = createDeviceFixture({ id: 'device-to-update' });
				const registrationData = createRegistrationDataFixture();

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(existingDevice);
				transactionRepository.save.mockImplementation(async (device) => device as Device);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await service.registerDevice(registrationData);

				expect(Logger.prototype.log).toHaveBeenCalledWith(
					'Updating existing device: device-to-update',
				);
			});

			it('should not create a new device during update', async () => {
				const existingDevice = createDeviceFixture();
				const registrationData = createRegistrationDataFixture();

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(existingDevice);
				transactionRepository.save.mockImplementation(async (device) => device as Device);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await service.registerDevice(registrationData);

				// Vérifier que create n'a PAS été appelé
				expect(transactionRepository.create).not.toHaveBeenCalled();
			});
		});

		describe('Transaction management', () => {
			it('should use a transaction for creation', async () => {
				const registrationData = createRegistrationDataFixture();
				const expectedDevice = createDeviceFixture();

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await service.registerDevice(registrationData);

				expect(dataSource.transaction).toHaveBeenCalledTimes(1);
				expect(dataSource.transaction).toHaveBeenCalledWith(expect.any(Function));
			});

			it('should use a transaction for update', async () => {
				const existingDevice = createDeviceFixture();
				const registrationData = createRegistrationDataFixture();

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(existingDevice);
				transactionRepository.save.mockImplementation(async (device) => device as Device);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await service.registerDevice(registrationData);

				expect(dataSource.transaction).toHaveBeenCalledTimes(1);
			});

			it('should rollback changes on error', async () => {
				const registrationData = createRegistrationDataFixture();
				const error = new Error('Database error');

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.save.mockRejectedValue(error);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await expect(service.registerDevice(registrationData)).rejects.toThrow(
					'Database error',
				);

				// La transaction devrait avoir été appelée
				expect(dataSource.transaction).toHaveBeenCalledTimes(1);
			});

			it('should use the transactional repository', async () => {
				const registrationData = createRegistrationDataFixture();
				const expectedDevice = createDeviceFixture();

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await service.registerDevice(registrationData);

				// Vérifier que withRepository a été appelé avec le bon repository
				expect(entityManager.withRepository).toHaveBeenCalledWith(deviceRepository);

				// Vérifier que le transactionRepository est utilisé
				expect(transactionRepository.findByUserAndFingerprint).toHaveBeenCalled();
			});
		});
	});

	describe('verifyDevice', () => {
		it('should verify an existing device', async () => {
			const deviceId = 'device-abc';
			const updateResult: UpdateResult = {
				affected: 1,
				raw: {},
				generatedMaps: [],
			};

			deviceRepository.update.mockResolvedValue(updateResult);

			await service.verifyDevice(deviceId);

			expect(deviceRepository.update).toHaveBeenCalledWith(
				{ id: deviceId },
				{ isVerified: true },
			);
		});

		it('should log successful verification', async () => {
			const deviceId = 'device-xyz';
			const updateResult: UpdateResult = {
				affected: 1,
				raw: {},
				generatedMaps: [],
			};

			deviceRepository.update.mockResolvedValue(updateResult);

			await service.verifyDevice(deviceId);

			expect(Logger.prototype.log).toHaveBeenCalledWith(`Device verified: ${deviceId}`);
		});

		it('should log a warning if device does not exist', async () => {
			const deviceId = 'non-existent-device';
			const updateResult: UpdateResult = {
				affected: 0,
				raw: {},
				generatedMaps: [],
			};

			deviceRepository.update.mockResolvedValue(updateResult);

			await service.verifyDevice(deviceId);

			expect(Logger.prototype.warn).toHaveBeenCalledWith(
				`No device found for verification: ${deviceId}`,
			);
		});

		it('should not throw an error if device does not exist', async () => {
			const deviceId = 'non-existent-device';
			const updateResult: UpdateResult = {
				affected: 0,
				raw: {},
				generatedMaps: [],
			};

			deviceRepository.update.mockResolvedValue(updateResult);

			// Ne devrait pas lever d'exception
			await expect(service.verifyDevice(deviceId)).resolves.toBeUndefined();
		});

		it('should be idempotent (already verified device)', async () => {
			const deviceId = 'already-verified-device';
			const updateResult: UpdateResult = {
				affected: 1,
				raw: {},
				generatedMaps: [],
			};

			deviceRepository.update.mockResolvedValue(updateResult);

			// Compter les appels initiaux au logger
			const initialLogCalls = (Logger.prototype.log as jest.Mock).mock.calls.length;

			// Premier appel
			await service.verifyDevice(deviceId);

			// Second appel
			await service.verifyDevice(deviceId);

			// Les deux appels devraient réussir
			expect(deviceRepository.update).toHaveBeenCalledTimes(2);
			expect(Logger.prototype.log).toHaveBeenCalledTimes(initialLogCalls + 2);
		});

		it('should propagate database errors', async () => {
			const deviceId = 'device-error';
			const error = new Error('Database connection error');

			deviceRepository.update.mockRejectedValue(error);

			await expect(service.verifyDevice(deviceId)).rejects.toThrow(
				'Database connection error',
			);
		});
	});

	describe('Edge cases and validation', () => {
		describe('Special characters', () => {
			it('should handle device names with special characters', async () => {
				const registrationData = createRegistrationDataFixture({
					deviceName: "John's iPhone (Pro Max) - 2024",
				});
				const expectedDevice = createDeviceFixture({
					deviceName: "John's iPhone (Pro Max) - 2024",
				});

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				expect(result.deviceName).toBe("John's iPhone (Pro Max) - 2024");
			});

			it('should handle unicode characters in names', async () => {
				const registrationData = createRegistrationDataFixture({
					deviceName: 'iPhone de François 🚀',
				});
				const expectedDevice = createDeviceFixture({
					deviceName: 'iPhone de François 🚀',
				});

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockResolvedValue(expectedDevice);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				const result = await service.registerDevice(registrationData);

				expect(result.deviceName).toBe('iPhone de François 🚀');
			});
		});

		describe('Database errors', () => {
			it('should propagate search errors', async () => {
				const registrationData = createRegistrationDataFixture();
				const error = new Error('Database query error');

				transactionRepository.findByUserAndFingerprint.mockRejectedValue(error);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await expect(service.registerDevice(registrationData)).rejects.toThrow(
					'Database query error',
				);
			});

			it('should propagate save errors', async () => {
				const registrationData = createRegistrationDataFixture();
				const expectedDevice = createDeviceFixture();
				const error = new Error('Database save error');

				transactionRepository.findByUserAndFingerprint.mockResolvedValue(null);
				transactionRepository.create.mockReturnValue(expectedDevice);
				transactionRepository.save.mockRejectedValue(error);

				dataSource.transaction.mockImplementation(async (callback) => {
					return callback(entityManager);
				});

				await expect(service.registerDevice(registrationData)).rejects.toThrow(
					'Database save error',
				);
			});
		});
	});
});
