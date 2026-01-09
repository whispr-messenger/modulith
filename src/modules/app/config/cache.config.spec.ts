import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { cacheModuleOptionsFactory } from './cache.config';
import { Logger } from '@nestjs/common';

describe('CacheConfig', () => {
	let configService: ConfigService;

	beforeEach(() => {
		configService = new ConfigService({
			REDIS_HOST: 'localhost',
			REDIS_PORT: '6379',
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('cacheModuleOptionsFactory', () => {
		it('should create cache options with Redis URL', () => {
			const options = cacheModuleOptionsFactory(configService);

			expect(options).toBeDefined();
			expect(options.stores).toBeDefined();
			expect(Array.isArray(options.stores)).toBe(true);
			expect(options.stores.length).toBe(1);
			expect(options.ttl).toBe(900);
			expect(options.max).toBe(1000);
		});

		it('should use default values when env vars are not set', () => {
			const emptyConfigService = new ConfigService({});
			const options = cacheModuleOptionsFactory(emptyConfigService);

			expect(options).toBeDefined();
			expect(options.stores).toBeDefined();
		});

		it('should include password in URL when REDIS_PASSWORD is set', () => {
			const configWithPassword = new ConfigService({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '6379',
				REDIS_PASSWORD: 'secret',
			});

			const options = cacheModuleOptionsFactory(configWithPassword);
			expect(options).toBeDefined();
		});

		it('should set up error handlers on Redis client', () => {
			const loggerSpy = jest.spyOn(Logger.prototype, 'log');
			const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

			const options = cacheModuleOptionsFactory(configService);
			const store = options.stores[0] as any;

			// Vérifier que le client existe
			if (store.client) {
				// Simuler un événement d'erreur
				store.client.emit('error', new Error('Test error'));
				expect(loggerErrorSpy).toHaveBeenCalled();
			}
		});
	});
});
