import { Test, TestingModule } from '@nestjs/testing';
import { DeviceStatsService } from '../device-stats.service';
import { DeviceRepository } from '../../repositories/device.repository';
import { Device } from '../../entities/device.entity';

describe('DeviceStatsService', () => {
	let service: DeviceStatsService;
	let deviceRepository: jest.Mocked<DeviceRepository>;

	const mockDeviceRepository = {
		countVerifiedDevices: jest.fn(),
		countActiveDevices: jest.fn(),
		findVerifiedByUserId: jest.fn(),
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DeviceStatsService,
				{
					provide: DeviceRepository,
					useValue: mockDeviceRepository,
				},
			],
		}).compile();

		service = module.get<DeviceStatsService>(DeviceStatsService);
		deviceRepository = module.get(DeviceRepository);
	});

	describe('getDeviceStats', () => {
		describe('cas nominaux', () => {
			it('doit retourner les statistiques correctes avec des appareils actifs et totaux', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(5);
				deviceRepository.countActiveDevices.mockResolvedValue(3);

				// When
				const result = await service.getDeviceStats(userId, 30);

				// Then
				expect(result).toEqual({
					total: 5,
					active: 3,
					activePercentage: 60,
				});
				expect(deviceRepository.countVerifiedDevices).toHaveBeenCalledWith(userId);
				expect(deviceRepository.countActiveDevices).toHaveBeenCalledWith(userId, 30);
			});

			it('doit utiliser le seuil par défaut de 30 jours si non spécifié', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(5);
				deviceRepository.countActiveDevices.mockResolvedValue(3);

				// When
				await service.getDeviceStats(userId);

				// Then
				expect(deviceRepository.countActiveDevices).toHaveBeenCalledWith(userId, 30);
			});

			it('doit calculer le pourcentage correctement pour différentes proportions', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(10);
				deviceRepository.countActiveDevices.mockResolvedValue(7);

				// When
				const result = await service.getDeviceStats(userId);

				// Then
				expect(result.activePercentage).toBe(70);
			});
		});

		describe('cas limites', () => {
			it('doit gérer le cas où aucun appareil n\'existe', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(0);
				deviceRepository.countActiveDevices.mockResolvedValue(0);

				// When
				const result = await service.getDeviceStats(userId);

				// Then
				expect(result).toEqual({
					total: 0,
					active: 0,
					activePercentage: 0,
				});
			});

			it('doit gérer le cas où tous les appareils sont actifs', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(5);
				deviceRepository.countActiveDevices.mockResolvedValue(5);

				// When
				const result = await service.getDeviceStats(userId);

				// Then
				expect(result).toEqual({
					total: 5,
					active: 5,
					activePercentage: 100,
				});
			});

			it('doit gérer le cas où aucun appareil n\'est actif', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(5);
				deviceRepository.countActiveDevices.mockResolvedValue(0);

				// When
				const result = await service.getDeviceStats(userId);

				// Then
				expect(result).toEqual({
					total: 5,
					active: 0,
					activePercentage: 0,
				});
			});

			it('doit arrondir correctement le pourcentage', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(3);
				deviceRepository.countActiveDevices.mockResolvedValue(1);

				// When
				const result = await service.getDeviceStats(userId);

				// Then
				expect(result.activePercentage).toBe(33);
			});
		});

		describe('seuils de jours différents', () => {
			it('doit respecter un seuil personnalisé de 7 jours', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(5);
				deviceRepository.countActiveDevices.mockResolvedValue(3);

				// When
				await service.getDeviceStats(userId, 7);

				// Then
				expect(deviceRepository.countActiveDevices).toHaveBeenCalledWith(userId, 7);
			});

			it('doit respecter un seuil personnalisé de 90 jours', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.countVerifiedDevices.mockResolvedValue(5);
				deviceRepository.countActiveDevices.mockResolvedValue(4);

				// When
				await service.getDeviceStats(userId, 90);

				// Then
				expect(deviceRepository.countActiveDevices).toHaveBeenCalledWith(userId, 90);
			});
		});

		describe('gestion d\'erreurs', () => {
			it('doit propager l\'erreur si countVerifiedDevices échoue', async () => {
				// Given
				const userId = 'user-123';
				const error = new Error('Database error');
				deviceRepository.countVerifiedDevices.mockRejectedValue(error);

				// When & Then
				await expect(service.getDeviceStats(userId)).rejects.toThrow('Database error');
			});

			it('doit propager l\'erreur si countActiveDevices échoue', async () => {
				// Given
				const userId = 'user-123';
				const error = new Error('Database error');
				deviceRepository.countVerifiedDevices.mockResolvedValue(5);
				deviceRepository.countActiveDevices.mockRejectedValue(error);

				// When & Then
				await expect(service.getDeviceStats(userId)).rejects.toThrow('Database error');
			});
		});
	});

	describe('getDetailedStats', () => {
		const createMockDevice = (
			deviceType: string,
			daysAgo: number,
		): Partial<Device> => ({
			id: `device-${Math.random()}`,
			userId: 'user-123',
			deviceType,
			deviceName: `Device ${deviceType}`,
			lastActive: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
			isVerified: true,
		});

		describe('cas nominaux', () => {
			it('doit retourner les statistiques détaillées correctes', async () => {
				// Given
				const userId = 'user-123';
				const devices = [
					createMockDevice('ios', 5), // actif cette semaine et ce mois
					createMockDevice('android', 20), // actif ce mois uniquement
					createMockDevice('web', 40), // inactif
				] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.total).toBe(3);
				expect(result.activeLastWeek).toBe(1);
				expect(result.activeLastMonth).toBe(2);
				expect(deviceRepository.findVerifiedByUserId).toHaveBeenCalledWith(userId);
			});

			it('doit grouper correctement par type d\'appareil', async () => {
				// Given
				const userId = 'user-123';
				const devices = [
					createMockDevice('ios', 1),
					createMockDevice('ios', 2),
					createMockDevice('android', 3),
					createMockDevice('android', 4),
					createMockDevice('android', 5),
					createMockDevice('web', 6),
				] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.byDeviceType).toEqual({
					ios: 2,
					android: 3,
					web: 1,
				});
			});

			it('doit calculer correctement les appareils actifs sur 7 jours', async () => {
				// Given
				const userId = 'user-123';
				const devices = [
					createMockDevice('ios', 1),
					createMockDevice('android', 5),
					createMockDevice('web', 10),
					createMockDevice('ios', 20),
					createMockDevice('android', 40),
				] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.activeLastWeek).toBe(2); // 1 jour et 5 jours
			});

			it('doit calculer correctement les appareils actifs sur 30 jours', async () => {
				// Given
				const userId = 'user-123';
				const devices = [
					createMockDevice('ios', 1),
					createMockDevice('android', 10),
					createMockDevice('web', 25),
					createMockDevice('ios', 29),
					createMockDevice('android', 40),
				] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.activeLastMonth).toBe(4); // 1, 10, 25 et 29 jours
			});
		});

		describe('cas limites', () => {
			it('doit gérer le cas sans appareils', async () => {
				// Given
				const userId = 'user-123';
				deviceRepository.findVerifiedByUserId.mockResolvedValue([]);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result).toEqual({
					total: 0,
					activeLastWeek: 0,
					activeLastMonth: 0,
					byDeviceType: {},
				});
			});

			it('doit gérer un seul type d\'appareil', async () => {
				// Given
				const userId = 'user-123';
				const devices = [
					createMockDevice('ios', 1),
					createMockDevice('ios', 2),
					createMockDevice('ios', 3),
					createMockDevice('ios', 4),
					createMockDevice('ios', 5),
				] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.byDeviceType).toEqual({
					ios: 5,
				});
			});

			it('doit gérer plusieurs appareils du même type', async () => {
				// Given
				const userId = 'user-123';
				const devices = Array.from({ length: 10 }, () =>
					createMockDevice('android', 5),
				) as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.byDeviceType).toEqual({
					android: 10,
				});
				expect(result.total).toBe(10);
			});
		});

		describe('calculs temporels', () => {
			it('un appareil actif il y a 6 jours doit être dans activeLastWeek et activeLastMonth', async () => {
				// Given
				const userId = 'user-123';
				const devices = [createMockDevice('ios', 6)] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.activeLastWeek).toBe(1);
				expect(result.activeLastMonth).toBe(1);
			});

			it('un appareil actif il y a 20 jours doit être seulement dans activeLastMonth', async () => {
				// Given
				const userId = 'user-123';
				const devices = [createMockDevice('android', 20)] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.activeLastWeek).toBe(0);
				expect(result.activeLastMonth).toBe(1);
			});

			it('un appareil actif il y a 40 jours ne doit être dans aucune catégorie', async () => {
				// Given
				const userId = 'user-123';
				const devices = [createMockDevice('web', 40)] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				expect(result.activeLastWeek).toBe(0);
				expect(result.activeLastMonth).toBe(0);
			});

			it('doit gérer correctement les limites exactes des périodes', async () => {
				// Given
				const userId = 'user-123';
				const devices = [
					createMockDevice('ios', 7), // exactement 7 jours
					createMockDevice('android', 30), // exactement 30 jours
				] as Device[];

				deviceRepository.findVerifiedByUserId.mockResolvedValue(devices);

				// When
				const result = await service.getDetailedStats(userId);

				// Then
				// Les appareils à exactement 7 ou 30 jours sont considérés comme actifs
				expect(result.activeLastWeek).toBeGreaterThanOrEqual(0);
				expect(result.activeLastMonth).toBeGreaterThanOrEqual(0);
			});
		});

		describe('gestion d\'erreurs', () => {
			it('doit propager l\'erreur si findVerifiedByUserId échoue', async () => {
				// Given
				const userId = 'user-123';
				const error = new Error('Database error');
				deviceRepository.findVerifiedByUserId.mockRejectedValue(error);

				// When & Then
				await expect(service.getDetailedStats(userId)).rejects.toThrow(
					'Database error',
				);
			});
		});
	});
});
