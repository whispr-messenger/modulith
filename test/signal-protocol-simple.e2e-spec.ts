import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/modules/app/app.module';

describe('Signal Protocol E2E - Simplified Tests', () => {
	let app: INestApplication<App>;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		
		// Apply same configuration as main.ts
		app.setGlobalPrefix('api');
		app.enableVersioning({
			type: 1, // VersioningType.URI
			defaultVersion: '1',
			prefix: 'v',
		});
		
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
			})
		);
		
		await app.init();
	}, 30000); // Augmenter le timeout

	afterAll(async () => {
		await app.close();
	});

	describe('Basic Routes', () => {
		it('should access health endpoint', async () => {
			const response = await request(app.getHttpServer())
				.get('/api/v1/health/ready')
				.expect(200);

			expect(response.body).toBeDefined();
		});

		it('should access signal health endpoint', async () => {
			const response = await request(app.getHttpServer())
				.get('/api/v1/signal/health')
				.expect(200);

			expect(response.body).toHaveProperty('status');
		});

		it('should request verification code', async () => {
			const phoneNumber = `+33${Math.floor(600000000 + Math.random() * 99999999)}`;

			const response = await request(app.getHttpServer())
				.post('/api/v1/verify/register/request')
				.send({ phoneNumber })
				.expect(200);

			expect(response.body).toHaveProperty('verificationId');
		});
	});
});
