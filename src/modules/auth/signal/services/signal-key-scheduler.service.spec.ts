import { Test, TestingModule } from '@nestjs/testing';
import { SignalKeySchedulerService } from './signal-key-scheduler.service';
import { SignalKeyRotationService } from './signal-key-rotation.service';
import { PreKeyRepository } from '../repositories';
import { PreKey } from '../entities';

describe('SignalKeySchedulerService', () => {
	let service: SignalKeySchedulerService;
	let rotationService: jest.Mocked<SignalKeyRotationService>;
	let preKeyRepository: jest.Mocked<PreKeyRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SignalKeySchedulerService,
				{
					provide: SignalKeyRotationService,
					useValue: {
						cleanupExpiredSignedPreKeys: jest.fn(),
					},
				},
				{
					provide: PreKeyRepository,
					useValue: {
						find: jest.fn(),
						remove: jest.fn(),
						createQueryBuilder: jest.fn(() => ({
							select: jest.fn().mockReturnThis(),
							addSelect: jest.fn().mockReturnThis(),
							where: jest.fn().mockReturnThis(),
							groupBy: jest.fn().mockReturnThis(),
							having: jest.fn().mockReturnThis(),
							getRawMany: jest.fn(),
						})),
					},
				},
			],
		}).compile();

		service = module.get<SignalKeySchedulerService>(SignalKeySchedulerService);
		rotationService = module.get(SignalKeyRotationService);
		preKeyRepository = module.get(PreKeyRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('cleanupExpiredSignedPreKeys', () => {
		it('should cleanup expired keys and update lastCleanupTime', async () => {
			rotationService.cleanupExpiredSignedPreKeys.mockResolvedValue(5);

			await service.cleanupExpiredSignedPreKeys();

			expect(rotationService.cleanupExpiredSignedPreKeys).toHaveBeenCalledWith(
				30,
			);
			expect(service.getSchedulerStats().lastCleanupTime).toBeDefined();
		});

		it('should log warning for high number of deleted keys', async () => {
			rotationService.cleanupExpiredSignedPreKeys.mockResolvedValue(150);

			await service.cleanupExpiredSignedPreKeys();

			expect(rotationService.cleanupExpiredSignedPreKeys).toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			rotationService.cleanupExpiredSignedPreKeys.mockRejectedValue(
				new Error('Database error'),
			);

			// Should not throw
			await expect(
				service.cleanupExpiredSignedPreKeys(),
			).resolves.not.toThrow();
		});
	});

	describe('checkUsersWithLowPrekeys', () => {
		it('should check users with low prekeys', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				having: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValue([
						{ userId: 'user1', count: '10' },
						{ userId: 'user2', count: '15' },
					]),
			};

			preKeyRepository.createQueryBuilder.mockReturnValue(
				mockQueryBuilder as any,
			);

			await service.checkUsersWithLowPrekeys();

			expect(preKeyRepository.createQueryBuilder).toHaveBeenCalledWith('prekey');
			expect(service.getSchedulerStats().lastPreKeyCheckTime).toBeDefined();
		});

		it('should handle no low prekeys users', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				having: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockResolvedValue([]),
			};

			preKeyRepository.createQueryBuilder.mockReturnValue(
				mockQueryBuilder as any,
			);

			await service.checkUsersWithLowPrekeys();

			expect(service.getSchedulerStats().lastPreKeyCheckTime).toBeDefined();
		});

		it('should handle errors gracefully', async () => {
			preKeyRepository.createQueryBuilder.mockImplementation(() => {
				throw new Error('Query error');
			});

			// Should not throw
			await expect(service.checkUsersWithLowPrekeys()).resolves.not.toThrow();
		});
	});

	describe('cleanupOldUnusedPreKeys', () => {
		it('should cleanup old unused prekeys', async () => {
			const mockOldPreKeys: Partial<PreKey>[] = [
				{
					id: 'pk1',
					userId: 'user1',
					keyId: 1,
					publicKey: 'key1',
					isUsed: false,
				},
				{
					id: 'pk2',
					userId: 'user2',
					keyId: 2,
					publicKey: 'key2',
					isUsed: false,
				},
			];

			preKeyRepository.find.mockResolvedValue(mockOldPreKeys as PreKey[]);
			preKeyRepository.remove.mockResolvedValue(undefined as any);

			await service.cleanupOldUnusedPreKeys();

			expect(preKeyRepository.find).toHaveBeenCalled();
			expect(preKeyRepository.remove).toHaveBeenCalledWith(mockOldPreKeys);
			expect(
				service.getSchedulerStats().lastOldPreKeyCleanupTime,
			).toBeDefined();
		});

		it('should handle no old prekeys to cleanup', async () => {
			preKeyRepository.find.mockResolvedValue([]);

			await service.cleanupOldUnusedPreKeys();

			expect(preKeyRepository.remove).not.toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			preKeyRepository.find.mockRejectedValue(new Error('Database error'));

			// Should not throw
			await expect(service.cleanupOldUnusedPreKeys()).resolves.not.toThrow();
		});
	});

	describe('getSchedulerStats', () => {
		it('should return scheduler statistics', () => {
			const stats = service.getSchedulerStats();

			expect(stats).toHaveProperty('lastCleanupTime');
			expect(stats).toHaveProperty('lastPreKeyCheckTime');
			expect(stats).toHaveProperty('lastOldPreKeyCleanupTime');
			expect(stats).toHaveProperty('isHealthy');
		});

		it('should report healthy when no jobs have run yet', () => {
			const stats = service.getSchedulerStats();

			expect(stats.isHealthy).toBe(true);
		});
	});

	describe('manualCleanup', () => {
		it('should perform manual cleanup', async () => {
			rotationService.cleanupExpiredSignedPreKeys.mockResolvedValue(3);
			preKeyRepository.find.mockResolvedValue([
				{ id: 'pk1' },
				{ id: 'pk2' },
			] as PreKey[]);
			preKeyRepository.remove.mockResolvedValue(undefined as any);

			const result = await service.manualCleanup();

			expect(result).toEqual({
				expiredKeysDeleted: 3,
				oldPreKeysDeleted: 2,
			});

			expect(rotationService.cleanupExpiredSignedPreKeys).toHaveBeenCalledWith(
				30,
			);
			expect(preKeyRepository.find).toHaveBeenCalled();
			expect(preKeyRepository.remove).toHaveBeenCalled();
		});
	});
});
