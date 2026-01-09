import { Test, TestingModule } from '@nestjs/testing';
import { SignalKeysHealthController } from './signal-keys-health.controller';
import { SignalKeySchedulerService } from '../services/signal-key-scheduler.service';
import { SignalKeyRotationService } from '../services/signal-key-rotation.service';
import { PreKeyRepository } from '../repositories';

describe('SignalKeysHealthController', () => {
	let controller: SignalKeysHealthController;
	let schedulerService: jest.Mocked<SignalKeySchedulerService>;
	let preKeyRepository: jest.Mocked<PreKeyRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SignalKeysHealthController],
			providers: [
				{
					provide: SignalKeySchedulerService,
					useValue: {
						getSchedulerStats: jest.fn(),
						manualCleanup: jest.fn(),
					},
				},
				{
					provide: SignalKeyRotationService,
					useValue: {},
				},
				{
					provide: PreKeyRepository,
					useValue: {
						count: jest.fn(),
						createQueryBuilder: jest.fn(() => ({
							select: jest.fn().mockReturnThis(),
							addSelect: jest.fn().mockReturnThis(),
							where: jest.fn().mockReturnThis(),
							groupBy: jest.fn().mockReturnThis(),
							getRawMany: jest.fn(),
						})),
					},
				},
			],
		}).compile();

		controller = module.get<SignalKeysHealthController>(
			SignalKeysHealthController,
		);
		schedulerService = module.get(SignalKeySchedulerService);
		preKeyRepository = module.get(PreKeyRepository);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getHealth', () => {
		it('should return healthy status when all is well', async () => {
			schedulerService.getSchedulerStats.mockReturnValue({
				lastCleanupTime: new Date(),
				lastPreKeyCheckTime: new Date(),
				lastOldPreKeyCleanupTime: new Date(),
				isHealthy: true,
			});

			preKeyRepository.count.mockResolvedValue(5000);

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValue([
						{ userId: 'user1', count: '50' },
						{ userId: 'user2', count: '100' },
					]),
			};

			preKeyRepository.createQueryBuilder.mockReturnValue(
				mockQueryBuilder as any,
			);

			const result = await controller.getHealth();

			expect(result.status).toBe('healthy');
			expect(result.issues).toHaveLength(0);
			expect(result.prekeys.totalUnused).toBe(5000);
			expect(result.prekeys.usersWithLowPrekeys).toBe(0);
		});

		it('should return unhealthy status when users have no prekeys', async () => {
			schedulerService.getSchedulerStats.mockReturnValue({
				lastCleanupTime: new Date(),
				lastPreKeyCheckTime: new Date(),
				lastOldPreKeyCleanupTime: null,
				isHealthy: true,
			});

			preKeyRepository.count.mockResolvedValue(1000);

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValue([
						{ userId: 'user1', count: '0' },
						{ userId: 'user2', count: '50' },
					]),
			};

			preKeyRepository.createQueryBuilder.mockReturnValue(
				mockQueryBuilder as any,
			);

			const result = await controller.getHealth();

			expect(result.status).toBe('unhealthy');
			expect(result.prekeys.usersWithNoPrekeys).toBe(1);
			expect(result.issues.length).toBeGreaterThan(0);
		});

		it('should return degraded status with low prekeys', async () => {
			schedulerService.getSchedulerStats.mockReturnValue({
				lastCleanupTime: new Date(),
				lastPreKeyCheckTime: new Date(),
				lastOldPreKeyCleanupTime: new Date(),
				isHealthy: true,
			});

			preKeyRepository.count.mockResolvedValue(3000);

			// Create 15 users with low prekeys
			const usersWithLowPrekeys = Array.from({ length: 15 }, (_, i) => ({
				userId: `user${i}`,
				count: '15',
			}));

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockResolvedValue(usersWithLowPrekeys),
			};

			preKeyRepository.createQueryBuilder.mockReturnValue(
				mockQueryBuilder as any,
			);

			const result = await controller.getHealth();

			expect(result.status).toBe('degraded');
			expect(result.prekeys.usersWithLowPrekeys).toBe(15);
		});

		it('should return unhealthy when scheduler is not healthy', async () => {
			schedulerService.getSchedulerStats.mockReturnValue({
				lastCleanupTime: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
				lastPreKeyCheckTime: new Date(),
				lastOldPreKeyCleanupTime: null,
				isHealthy: false,
			});

			preKeyRepository.count.mockResolvedValue(5000);

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockResolvedValue([]),
			};

			preKeyRepository.createQueryBuilder.mockReturnValue(
				mockQueryBuilder as any,
			);

			const result = await controller.getHealth();

			expect(result.status).toBe('unhealthy');
			expect(result.issues).toContain('Scheduler jobs not running as expected');
		});
	});

	describe('triggerManualCleanup', () => {
		it('should trigger manual cleanup', async () => {
			schedulerService.manualCleanup.mockResolvedValue({
				expiredKeysDeleted: 10,
				oldPreKeysDeleted: 25,
			});

			const result = await controller.triggerManualCleanup();

			expect(result).toEqual({
				message: 'Cleanup completed successfully',
				expiredKeysDeleted: 10,
				oldPreKeysDeleted: 25,
			});

			expect(schedulerService.manualCleanup).toHaveBeenCalled();
		});
	});
});
