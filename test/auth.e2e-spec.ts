import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Validate } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../src/modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserAuth } from '../src/modules/auth/common/entities/user-auth.entity';
import { Device } from '../src/modules/auth/devices/entities/device.entity';
import { BackupCode } from '../src/modules/auth/base/entities/backup-code.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { CommonModule } from '../src/modules/auth/common/common.module';
import { BaseAuthenticationModule } from '../src/modules/auth/base/base-authentication.module';
import { DevicesModule } from '../src/modules/auth/devices/devices.module';
import { TokensModule } from '../src/modules/auth/tokens/tokens.module';
import { generateKeyPairSync } from 'crypto';

describe('AuthModule (e2e)', () => {
    let app: INestApplication;
    let cacheManager: Cache;
    let accessToken: string;
    let refreshToken: string;
    let verificationId: string;

    const testPhoneNumber = '+1234567890';

    beforeAll(async () => {
        // Generate valid EC keys for ES256
        const { privateKey, publicKey } = generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [() => ({
                        JWT_PRIVATE_KEY: privateKey,
                        JWT_PUBLIC_KEY: publicKey,
                        JWT_ACCESS_EXPIRATION: '1h',
                        JWT_REFRESH_EXPIRATION: '7d',
                    })],
                }),
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [UserAuth, Device, BackupCode],
                    synchronize: true,
                }),
                AuthModule,
                BaseAuthenticationModule,
                DevicesModule,
                TokensModule,
                RouterModule.register([
                    {
                        path: 'auth',
                        module: AuthModule,
                        children: [
                            {
                                path: '/',
                                module: BaseAuthenticationModule,
                            },
                            {
                                path: '/',
                                module: DevicesModule,
                            },
                            {
                                path: '/',
                                module: TokensModule,
                            },
                        ],
                    },
                ]),
                CommonModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        cacheManager = app.get<Cache>(CACHE_MANAGER);

        app.setGlobalPrefix('api', { exclude: ['/'] });
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/api/auth/register (POST)', () => {
        it('should register a new user and return tokens', async () => {
            // 1. Seed the cache with a verified phone number state
            verificationId = uuidv4();
            const verificationData = {
                phoneNumber: testPhoneNumber,
                hashedCode: 'mocked_hash',
                purpose: 'registration',
                attempts: 0,
                expiresAt: Date.now() + 1000000,
                verified: true
            };

            await cacheManager.set(
                `verification:${verificationId}`,
                JSON.stringify(verificationData),
                1000
            );

            // 2. Prepare payload matching RegisterDto
            const registerPayload = {
                verificationId: verificationId,
                firstName: 'Test',
                lastName: 'User',
                deviceName: 'Test Device',
                deviceType: 'ios',
                publicKey: 'test-public-key-123'
            };

            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send(registerPayload)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                });
        });

    });

    describe('/api/auth/login (POST)', () => {
        it('should login an existing user and return tokens', async () => {
            // 1. Seed the cache with a verified phone number state for login
            const loginVerificationId = uuidv4();
            const verificationData = {
                phoneNumber: testPhoneNumber,
                hashedCode: 'mocked_hash_login',
                purpose: 'login',
                attempts: 0,
                expiresAt: Date.now() + 1000000,
                verified: true
            };

            await cacheManager.set(
                `verification:${loginVerificationId}`,
                JSON.stringify(verificationData),
                1000
            );

            // 2. Prepare payload matching LoginDto
            const loginPayload = {
                verificationId: loginVerificationId,
                deviceName: 'Test Device Login',
                deviceType: 'ios',
                publicKey: 'test-public-key-login'
            };

            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send(loginPayload)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    // Update tokens for subsequent tests
                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                });
        });
    });

    describe('Protected Routes & Device Management', () => {
        it('should allow access to get devices and capture deviceId', async () => {
            return request(app.getHttpServer())
                .get('/api/auth/devices')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBeTruthy();
                    expect(res.body.length).toBeGreaterThan(0);
                    // Capture the first device ID
                    deviceId = res.body[0].id;
                    expect(deviceId).toBeDefined();
                });
        });

        it('should deny access without token', () => {
            return request(app.getHttpServer())
                .get('/api/auth/devices')
                .expect(401);
        });

        it('should refresh tokens', () => {
            return request(app.getHttpServer())
                .post('/api/auth/tokens/refresh')
                .send({
                    refreshToken: refreshToken,
                    deviceType: 'ios'
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                });
        });

        it('should revoke a device', async () => {
            return request(app.getHttpServer())
                .delete(`/api/auth/devices/${deviceId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(204);
        });
    });

    describe('Error Handling & Edge Cases', () => {
        it('should fail to register with duplicate phone number', async () => {
            const duplicateVerificationId = uuidv4();
            const verificationData = {
                phoneNumber: testPhoneNumber, // Same number as registered user
                hashedCode: 'mocked_hash_dup',
                purpose: 'registration',
                attempts: 0,
                expiresAt: Date.now() + 1000000,
                verified: true
            };

            await cacheManager.set(
                `verification:${duplicateVerificationId}`,
                JSON.stringify(verificationData),
                1000
            );

            await request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    verificationId: duplicateVerificationId,
                    firstName: 'Duplicate',
                    lastName: 'User',
                    deviceType: 'ios',
                    deviceName: 'Dup Device',
                    publicKey: 'dup-key'
                })
                .expect(409); // ConflictException
        });

        it('should fail to login with invalid verification code', async () => {
            const invalidVerificationId = uuidv4(); // Not in cache

            await request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    verificationId: invalidVerificationId,
                    deviceType: 'ios',
                })
                .expect(400); // BadRequestException
        });

        it('should fail to refresh with invalid token', async () => {
            await request(app.getHttpServer())
                .post('/api/auth/tokens/refresh')
                .send({
                    refreshToken: 'invalid-refresh-token',
                    deviceType: 'ios',
                })
                .expect(401);
        });
    });
});
