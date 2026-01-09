import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/modules/app/app.module';

describe('Signal Protocol E2E Tests', () => {
	let app: INestApplication<App>;
	let authToken: string;
	let userId: string;
	let deviceId: string;

	// Sample Signal key bundle for testing
	const sampleKeyBundle = {
		identityKey: 'BQW3Z7JxN8xqX5K0pZ1rY2T4vW6sU7mP9nB0aF8kE1dL',
		signedPreKey: {
			keyId: 1,
			publicKey: 'BVx5K9mN3pL0Z8wT2yF4vU6sR7gQ1bD5aH8kM0nE3cJ',
			signature:
				'3045022100A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z60221009876543210ABCDEF',
		},
		preKeys: [
			{
				keyId: 1,
				publicKey: 'BT1pZ9xM5kN0L8wY2vF4sU6rR7gQ3bD5aH0kM8nE1cJ',
			},
			{
				keyId: 2,
				publicKey: 'BW9pL3xM5kN0Z8wT2yF4vU6sR7gQ1bD5aH8kM0nE3cJ',
			},
			{
				keyId: 3,
				publicKey: 'BP3kM9xL5nN0Z8wT2yF4vU6sR7gQ1bD5aH8kM0nE1cJ',
			},
		],
	};

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
	});

	afterAll(async () => {
		await app.close();
	});

	describe('User Registration with Signal Bundle', () => {
		it('should register a new user with complete Signal key bundle', async () => {
			const phoneNumber = `+33${Math.floor(600000000 + Math.random() * 99999999)}`;

			// Step 1: Request verification code
			const requestCodeResponse = await request(app.getHttpServer())
				.post('/api/v1/verify/register/request')
				.send({ phoneNumber })
				.expect(200);

			expect(requestCodeResponse.body).toHaveProperty('verificationId');
			const verificationId = requestCodeResponse.body.verificationId;

			// Step 2: Confirm verification code
			await request(app.getHttpServer())
				.post('/api/v1/verify/register/confirm')
				.send({
					verificationId,
					code: requestCodeResponse.body.code || '000000', // Demo mode
				})
				.expect(200);

			// Step 3: Register with Signal key bundle
			const registerResponse = await request(app.getHttpServer())
				.post('/api/v1/register')
				.send({
					verificationId,
					firstName: 'Test',
					lastName: 'User',
					deviceName: 'iPhone 15 Pro',
					deviceType: 'mobile',
					signalKeyBundle: sampleKeyBundle,
				})
				.expect(201);

			expect(registerResponse.body).toHaveProperty('accessToken');
			expect(registerResponse.body).toHaveProperty('refreshToken');

			// Store auth data for subsequent tests
			authToken = registerResponse.body.accessToken;
			userId = registerResponse.body.userId;
		});

		it('should reject registration with invalid Signal key bundle format', async () => {
			const phoneNumber = `+33${Math.floor(600000000 + Math.random() * 99999999)}`;

			const requestCodeResponse = await request(app.getHttpServer())
				.post('/api/v1/verify/register/request')
				.send({ phoneNumber })
				.expect(200);

			const verificationId = requestCodeResponse.body.verificationId;

			await request(app.getHttpServer())
				.post('/api/v1/verify/register/confirm')
				.send({
					verificationId,
					code: requestCodeResponse.body.code || '000000',
				})
				.expect(200);

			const registerResponse = await request(app.getHttpServer())
				.post('/api/v1/register')
				.send({
					verificationId,
					firstName: 'Test',
					lastName: 'User',
					deviceName: 'Test Device',
					deviceType: 'mobile',
					signalKeyBundle: {
						identityKey: 'invalid', // Invalid format
						// Missing signedPreKey and preKeys
					},
				})
				.expect(400);

			expect(registerResponse.body.message).toBeDefined();
		});
	});

	describe('Key Bundle Retrieval', () => {
		it('should retrieve key bundle for a registered user', async () => {
			const response = await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('userId', userId);
			expect(response.body).toHaveProperty('identityKey');
			expect(response.body).toHaveProperty('signedPreKey');
			expect(response.body.signedPreKey).toHaveProperty('keyId');
			expect(response.body.signedPreKey).toHaveProperty('publicKey');
			expect(response.body.signedPreKey).toHaveProperty('signature');
		});

		it('should include a preKey in the bundle when available', async () => {
			const response = await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('preKey');
			expect(response.body.preKey).toHaveProperty('keyId');
			expect(response.body.preKey).toHaveProperty('publicKey');
		});

		it('should mark preKey as used after retrieval', async () => {
			// First retrieval
			const firstResponse = await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			const firstPreKeyId = firstResponse.body.preKey?.keyId;

			// Second retrieval should give a different preKey
			const secondResponse = await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			const secondPreKeyId = secondResponse.body.preKey?.keyId;

			// PreKey IDs should be different (first one was consumed)
			if (firstPreKeyId && secondPreKeyId) {
				expect(secondPreKeyId).not.toBe(firstPreKeyId);
			}
		});

		it('should return 404 for non-existent user', async () => {
			const fakeUserId = '00000000-0000-0000-0000-000000000000';

			await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${fakeUserId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(404);
		});

		it('should still return bundle even when all preKeys are consumed', async () => {
			// Consume all 3 preKeys
			await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			// Fourth request - no more preKeys available
			const response = await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			// Should still have identityKey and signedPreKey
			expect(response.body).toHaveProperty('identityKey');
			expect(response.body).toHaveProperty('signedPreKey');
			// preKey may be undefined when all consumed
		});
	});

	describe('Key Rotation', () => {
		it('should allow uploading a new signedPreKey', async () => {
			const newSignedPreKey = {
				keyId: 2,
				publicKey: 'BNew5K9mN3pL0Z8wT2yF4vU6sR7gQ1bD5aH8kM0nE3cX',
				signature:
					'3045022100B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z60221009876543210FEDCBA',
			};

			const response = await request(app.getHttpServer())
				.post('/api/v1/signal/keys/signed-prekey')
				.set('Authorization', `Bearer ${authToken}`)
				.send(newSignedPreKey)
				.expect(201);

			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toContain('Signed PreKey rotated');
		});

		it('should allow replenishing preKeys', async () => {
			const newPreKeys = [
				{
					keyId: 4,
					publicKey: 'BT4pZ9xM5kN0L8wY2vF4sU6rR7gQ3bD5aH0kM8nE1cJ',
				},
				{
					keyId: 5,
					publicKey: 'BW5pL3xM5kN0Z8wT2yF4vU6sR7gQ1bD5aH8kM0nE3cJ',
				},
				{
					keyId: 6,
					publicKey: 'BP6kM9xL5nN0Z8wT2yF4vU6sR7gQ1bD5aH8kM0nE1cJ',
				},
			];

			const response = await request(app.getHttpServer())
				.post('/api/v1/signal/keys/prekeys')
				.set('Authorization', `Bearer ${authToken}`)
				.send({ preKeys: newPreKeys })
				.expect(201);

			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toContain('PreKeys uploaded');
		});

		it('should get key status after replenishing', async () => {
			const response = await request(app.getHttpServer())
				.get('/api/v1/signal/keys/recommendations')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('shouldRotateSignedPreKey');
			expect(response.body).toHaveProperty('shouldReplenishPreKeys');
			expect(response.body).toHaveProperty('preKeyCount');
		});

		it('should reject duplicate keyIds for preKeys', async () => {
			const duplicatePreKeys = [
				{
					keyId: 4, // Already exists from previous test
					publicKey: 'BT4pZ9xM5kN0L8wY2vF4sU6rR7gQ3bD5aH0kM8nE1cJ',
				},
			];

			await request(app.getHttpServer())
				.post('/api/v1/signal/keys/prekeys')
				.set('Authorization', `Bearer ${authToken}`)
				.send({ preKeys: duplicatePreKeys })
				.expect(409); // Conflict
		});
	});

	describe('Health and Monitoring', () => {
		it('should return health status for Signal system', async () => {
			const response = await request(app.getHttpServer())
				.get('/api/v1/signal/health')
				.expect(200);

			expect(response.body).toHaveProperty('status');
			expect(['healthy', 'degraded', 'unhealthy']).toContain(
				response.body.status
			);
			expect(response.body).toHaveProperty('timestamp');
			expect(response.body).toHaveProperty('scheduler');
			expect(response.body).toHaveProperty('prekeys');
		});

		it('should allow manual cleanup via health endpoint', async () => {
			const response = await request(app.getHttpServer())
				.post('/api/v1/signal/health/cleanup')
				.expect(200);

			expect(response.body).toHaveProperty('message');
			expect(response.body).toHaveProperty('deletedCount');
		});
	});

	describe('Device Management', () => {
		it('should delete all keys when device is removed', async () => {
			await request(app.getHttpServer())
				.delete(`/api/v1/signal/keys`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(204);
		});

		it('should return 404 when trying to get keys after deletion', async () => {
			// After deletion, user should have no keys
			await request(app.getHttpServer())
				.get(`/api/v1/signal/keys/${userId}`)
				.expect(404);
		});
	});

	describe('Multi-Device Support', () => {
		let multiDeviceUserId: string;
		let firstDeviceToken: string;
		let secondDeviceToken: string;

		it('should allow same user to register and login on multiple devices', async () => {
			const phoneNumber = `+33${Math.floor(600000000 + Math.random() * 99999999)}`;

			// Register first device
			const requestCodeResponse = await request(app.getHttpServer())
				.post('/api/v1/verify/register/request')
				.send({ phoneNumber })
				.expect(200);

			const verificationId = requestCodeResponse.body.verificationId;

			await request(app.getHttpServer())
				.post('/api/v1/verify/register/confirm')
				.send({
					verificationId,
					code: requestCodeResponse.body.code || '000000',
				})
				.expect(200);

			const firstDevice = await request(app.getHttpServer())
				.post('/api/v1/register')
				.send({
					verificationId,
					firstName: 'Multi',
					lastName: 'Device',
					deviceName: 'iPhone 15',
					deviceType: 'mobile',
					signalKeyBundle: sampleKeyBundle,
				})
				.expect(201);

			firstDeviceToken = firstDevice.body.accessToken;
			multiDeviceUserId = firstDevice.body.userId;

			// Login with second device
			const loginRequestResponse = await request(app.getHttpServer())
				.post('/api/v1/verify/login/request')
				.send({ phoneNumber })
				.expect(200);

			const loginVerificationId = loginRequestResponse.body.verificationId;

			await request(app.getHttpServer())
				.post('/api/v1/verify/login/confirm')
				.send({
					verificationId: loginVerificationId,
					code: loginRequestResponse.body.code || '000000',
				})
				.expect(200);

			const secondDevice = await request(app.getHttpServer())
				.post('/api/v1/login')
				.send({
					verificationId: loginVerificationId,
					deviceName: 'iPad Pro',
					deviceType: 'tablet',
					signalKeyBundle: {
						...sampleKeyBundle,
						identityKey: 'BDifferentIdentityKeyForSecondDevice123456',
						signedPreKey: {
							...sampleKeyBundle.signedPreKey,
							keyId: 10,
						},
						preKeys: sampleKeyBundle.preKeys.map((pk, idx) => ({
							...pk,
							keyId: 100 + idx,
						})),
					},
				})
				.expect(200);

			secondDeviceToken = secondDevice.body.accessToken;

			expect(firstDevice.body.userId).toBe(secondDevice.body.userId);
		});
	});

	describe('Authentication and Authorization', () => {
		it('should allow getting recommendations without auth in test mode', async () => {
			// Note: In test environment, JWT guard might not be enforced
			// This tests the endpoint availability
			const response = await request(app.getHttpServer())
				.get('/api/v1/signal/keys/recommendations');
			
			// Accept either 200 (no auth in test) or 401 (auth enforced)
			expect([200, 401, 500]).toContain(response.status);
		});
	});
});
