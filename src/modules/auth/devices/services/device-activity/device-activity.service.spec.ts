import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeviceActivityService } from '../device-activity.service';
import { DeviceRepository } from '../../repositories/device.repository';

describe('DeviceActivityService', () => {
	let service: DeviceActivityService;
	let deviceRepository: jest.Mocked<DeviceRepository>;

	beforeEach(async () => {
		const mockDeviceRepository = {
			update: jest.fn(),
			findActiveDevices: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DeviceActivityService,
				{
					provide: DeviceRepository,
					useValue: mockDeviceRepository,
				},
			],
		}).compile();

		service = module.get<DeviceActivityService>(DeviceActivityService);
		deviceRepository = module.get(DeviceRepository);

		// Silence logger during tests
		jest.spyOn(service['logger'], 'debug').mockImplementation();
		jest.spyOn(service['logger'], 'log').mockImplementation();
		jest.spyOn(service['logger'], 'warn').mockImplementation();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('updateLastActive', () => {
		const deviceId = 'device-123';

		it('doit mettre à jour lastActive avec succès', async () => {
			// Arrange
			deviceRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

			// Act
			await service.updateLastActive(deviceId);

			// Assert
			expect(deviceRepository.update).toHaveBeenCalledWith(
				{ id: deviceId },
				expect.objectContaining({
					lastActive: expect.any(Date),
				}),
			);
			expect(service['logger'].debug).toHaveBeenCalledWith(
				`Activity updated for device: ${deviceId}`,
			);
		});

		it('doit lever NotFoundException si l\'appareil n\'existe pas', async () => {
			// Arrange
			deviceRepository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

			// Act & Assert
			await expect(service.updateLastActive(deviceId)).rejects.toThrow(NotFoundException);
			await expect(service.updateLastActive(deviceId)).rejects.toThrow('Device not found');

			expect(service['logger'].warn).toHaveBeenCalledWith(
				`Device not found for activity update: ${deviceId}`,
			);
		});

		it('doit mettre à jour avec une date récente', async () => {
			// Arrange
			const beforeDate = new Date();
			deviceRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

			// Act
			await service.updateLastActive(deviceId);

			// Assert
			const updateCall = deviceRepository.update.mock.calls[0];
			const lastActive = updateCall[1].lastActive as Date;
			const afterDate = new Date();

			expect(lastActive.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
			expect(lastActive.getTime()).toBeLessThanOrEqual(afterDate.getTime());
		});
	});

	describe('updateFCMToken', () => {
		const deviceId = 'device-123';
		const fcmToken = 'fcm-token-abc123';

		it('doit mettre à jour le token FCM et lastActive avec succès', async () => {
			// Arrange
			deviceRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

			// Act
			await service.updateFCMToken(deviceId, fcmToken);

			// Assert
			expect(deviceRepository.update).toHaveBeenCalledWith(
				{ id: deviceId },
				expect.objectContaining({
					fcmToken,
					lastActive: expect.any(Date),
				}),
			);
			expect(service['logger'].log).toHaveBeenCalledWith(
				`FCM token updated for device: ${deviceId}`,
			);
		});

		it('doit lever NotFoundException si l\'appareil n\'existe pas', async () => {
			// Arrange
			deviceRepository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

			// Act & Assert
			await expect(service.updateFCMToken(deviceId, fcmToken)).rejects.toThrow(
				NotFoundException,
			);
			await expect(service.updateFCMToken(deviceId, fcmToken)).rejects.toThrow(
				'Device not found',
			);

			expect(service['logger'].warn).toHaveBeenCalledWith(
				`Device not found for FCM token update: ${deviceId}`,
			);
		});

		it('doit mettre à jour avec un token vide', async () => {
			// Arrange
			const emptyToken = '';
			deviceRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

			// Act
			await service.updateFCMToken(deviceId, emptyToken);

			// Assert
			expect(deviceRepository.update).toHaveBeenCalledWith(
				{ id: deviceId },
				expect.objectContaining({
					fcmToken: emptyToken,
					lastActive: expect.any(Date),
				}),
			);
			expect(service['logger'].log).toHaveBeenCalledWith(
				`FCM token updated for device: ${deviceId}`,
			);
		});

		it('doit mettre à jour fcmToken et lastActive avec des dates récentes', async () => {
			// Arrange
			const beforeDate = new Date();
			deviceRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

			// Act
			await service.updateFCMToken(deviceId, fcmToken);

			// Assert
			const updateCall = deviceRepository.update.mock.calls[0];
			const lastActive = updateCall[1].lastActive as Date;
			const afterDate = new Date();

			expect(lastActive.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
			expect(lastActive.getTime()).toBeLessThanOrEqual(afterDate.getTime());
		});
	});

	describe('getActiveDevices', () => {
		const userId = 'user-123';
		const mockDevices = [
			{
				id: 'device-1',
				userId,
				deviceName: 'iPhone 14',
				deviceType: 'mobile',
				lastActive: new Date(),
			},
			{
				id: 'device-2',
				userId,
				deviceName: 'MacBook Pro',
				deviceType: 'desktop',
				lastActive: new Date(),
			},
		];

		it('doit retourner les appareils actifs avec le seuil par défaut (30 jours)', async () => {
			// Arrange
			deviceRepository.findActiveDevices.mockResolvedValue(mockDevices);

			// Act
			const result = await service.getActiveDevices(userId);

			// Assert
			expect(deviceRepository.findActiveDevices).toHaveBeenCalledWith(userId, 30);
			expect(result).toEqual(mockDevices);
			expect(result).toHaveLength(2);
		});

		it('doit retourner les appareils actifs avec un seuil personnalisé', async () => {
			// Arrange
			const customThreshold = 7;
			deviceRepository.findActiveDevices.mockResolvedValue(mockDevices);

			// Act
			const result = await service.getActiveDevices(userId, customThreshold);

			// Assert
			expect(deviceRepository.findActiveDevices).toHaveBeenCalledWith(userId, customThreshold);
			expect(result).toEqual(mockDevices);
		});

		it('doit retourner un tableau vide si aucun appareil actif', async () => {
			// Arrange
			deviceRepository.findActiveDevices.mockResolvedValue([]);

			// Act
			const result = await service.getActiveDevices(userId);

			// Assert
			expect(deviceRepository.findActiveDevices).toHaveBeenCalledWith(userId, 30);
			expect(result).toEqual([]);
			expect(result).toHaveLength(0);
		});

		it('doit gérer un seuil de 0 jour', async () => {
			// Arrange
			deviceRepository.findActiveDevices.mockResolvedValue([]);

			// Act
			const result = await service.getActiveDevices(userId, 0);

			// Assert
			expect(deviceRepository.findActiveDevices).toHaveBeenCalledWith(userId, 0);
			expect(result).toEqual([]);
		});

		it('doit gérer un seuil très élevé', async () => {
			// Arrange
			const highThreshold = 365;
			deviceRepository.findActiveDevices.mockResolvedValue(mockDevices);

			// Act
			const result = await service.getActiveDevices(userId, highThreshold);

			// Assert
			expect(deviceRepository.findActiveDevices).toHaveBeenCalledWith(userId, highThreshold);
			expect(result).toEqual(mockDevices);
		});

		it('doit passer la valeur de seuil exacte au repository', async () => {
			// Arrange
			const specificThreshold = 15;
			deviceRepository.findActiveDevices.mockResolvedValue(mockDevices);

			// Act
			await service.getActiveDevices(userId, specificThreshold);

			// Assert
			const calls = deviceRepository.findActiveDevices.mock.calls;
			expect(calls[0][0]).toBe(userId);
			expect(calls[0][1]).toBe(specificThreshold);
		});
	});

	describe('Edge Cases et Validation', () => {
		it('updateLastActive doit gérer un deviceId vide', async () => {
			// Arrange
			const emptyDeviceId = '';
			deviceRepository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

			// Act & Assert
			await expect(service.updateLastActive(emptyDeviceId)).rejects.toThrow(
				NotFoundException,
			);
		});

		it('updateFCMToken doit gérer un deviceId invalide', async () => {
			// Arrange
			const invalidDeviceId = 'non-existent-device';
			const fcmToken = 'some-token';
			deviceRepository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

			// Act & Assert
			await expect(service.updateFCMToken(invalidDeviceId, fcmToken)).rejects.toThrow(
				NotFoundException,
			);
		});

		it('getActiveDevices doit accepter des seuils négatifs (comportement du repository)', async () => {
			// Arrange
			const negativeThreshold = -5;
			deviceRepository.findActiveDevices.mockResolvedValue([]);

			// Act
			const result = await service.getActiveDevices('user-123', negativeThreshold);

			// Assert
			expect(deviceRepository.findActiveDevices).toHaveBeenCalledWith(
				'user-123',
				negativeThreshold,
			);
			expect(result).toEqual([]);
		});
	});

	describe('Logger Behavior', () => {
		it('doit logger en debug lors d\'une mise à jour réussie de lastActive', async () => {
			// Arrange
			const deviceId = 'device-123';
			deviceRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

			// Act
			await service.updateLastActive(deviceId);

			// Assert
			expect(service['logger'].debug).toHaveBeenCalledTimes(1);
			expect(service['logger'].debug).toHaveBeenCalledWith(
				expect.stringContaining('Activity updated for device'),
			);
		});

		it('doit logger un warning lors d\'un échec de mise à jour de lastActive', async () => {
			// Arrange
			const deviceId = 'device-123';
			deviceRepository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

			// Act
			try {
				await service.updateLastActive(deviceId);
			} catch (error) {
				// Expected exception
			}

			// Assert
			expect(service['logger'].warn).toHaveBeenCalledTimes(1);
			expect(service['logger'].warn).toHaveBeenCalledWith(
				expect.stringContaining('Device not found for activity update'),
			);
		});

		it('doit logger en log lors d\'une mise à jour réussie du FCM token', async () => {
			// Arrange
			const deviceId = 'device-123';
			const fcmToken = 'token-123';
			deviceRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

			// Act
			await service.updateFCMToken(deviceId, fcmToken);

			// Assert
			expect(service['logger'].log).toHaveBeenCalledTimes(1);
			expect(service['logger'].log).toHaveBeenCalledWith(
				expect.stringContaining('FCM token updated for device'),
			);
		});

		it('doit logger un warning lors d\'un échec de mise à jour du FCM token', async () => {
			// Arrange
			const deviceId = 'device-123';
			const fcmToken = 'token-123';
			deviceRepository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

			// Act
			try {
				await service.updateFCMToken(deviceId, fcmToken);
			} catch (error) {
				// Expected exception
			}

			// Assert
			expect(service['logger'].warn).toHaveBeenCalledTimes(1);
			expect(service['logger'].warn).toHaveBeenCalledWith(
				expect.stringContaining('Device not found for FCM token update'),
			);
		});
	});
});
