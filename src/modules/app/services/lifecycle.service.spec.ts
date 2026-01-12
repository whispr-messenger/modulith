import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LifecycleService } from './lifecycle.service';
import { Logger } from '@nestjs/common';

describe('LifecycleService', () => {
	let service: LifecycleService;
	let mockCacheManager: any;

	beforeEach(async () => {
		mockCacheManager = {
			store: {
				client: {
					quit: jest.fn().mockResolvedValue(undefined),
				},
			},
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LifecycleService,
				{
					provide: CACHE_MANAGER,
					useValue: mockCacheManager,
				},
			],
		}).compile();

		service = module.get<LifecycleService>(LifecycleService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('onModuleInit', () => {
		it('should log initialization message', () => {
			const logSpy = jest.spyOn(Logger.prototype, 'log');
			service.onModuleInit();
			expect(logSpy).toHaveBeenCalledWith('Application modules initialized');
		});
	});

	describe('onModuleDestroy', () => {
		it('should log shutdown message', () => {
			const logSpy = jest.spyOn(Logger.prototype, 'log');
			service.onModuleDestroy();
			expect(logSpy).toHaveBeenCalledWith('Application is shutting down');
		});
	});

	describe('graceful shutdown', () => {
		it('should close Redis connection on SIGTERM', async () => {
			// Initialiser le service pour configurer les handlers
			service.onModuleInit();

			// Émettre SIGTERM
			process.emit('SIGTERM', 'SIGTERM');

			// Attendre un peu pour que le handler async se termine
			await new Promise(resolve => setTimeout(resolve, 100));

			expect(mockCacheManager.store.client.quit).toHaveBeenCalledTimes(1);
		});

		it('should not call Redis quit multiple times on multiple SIGTERM', async () => {
			service.onModuleInit();

			// Émettre SIGTERM plusieurs fois rapidement
			process.emit('SIGTERM', 'SIGTERM');
			process.emit('SIGTERM', 'SIGTERM');
			process.emit('SIGTERM', 'SIGTERM');

			await new Promise(resolve => setTimeout(resolve, 100));

			// Le quit ne devrait être appelé qu'une seule fois grâce au flag
			expect(mockCacheManager.store.client.quit).toHaveBeenCalledTimes(1);
		});

		it('should handle errors during shutdown gracefully', async () => {
			const errorLogSpy = jest.spyOn(Logger.prototype, 'error');
			mockCacheManager.store.client.quit.mockRejectedValueOnce(new Error('Connection error'));

			service.onModuleInit();
			process.emit('SIGTERM', 'SIGTERM');

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(errorLogSpy).toHaveBeenCalledWith(
				'Error during graceful shutdown:',
				expect.any(Error)
			);
		});
	});
});
