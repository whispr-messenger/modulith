import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuickResponseCodeService } from './quick-response-code.service';
import { Device } from '../../entities/device.entity';
import { UserAuth } from '../../../common/entities/user-auth.entity';
import { DeviceRegistrationService } from '../../services/device-registration.service';
import { TokensService } from '../../../tokens/services/tokens.service';
import { ScanLoginDto } from '../dto/scan-login.dto';
import { DeviceFingerprint } from '../../types/device-fingerprint.interface';
import { TokenPair } from '../../../tokens/types/token-pair.interface';
import { QRChallengeData } from '../types/quick-response-challeng-data.interface';

describe('QuickResponseCodeService', () => {
	let service: QuickResponseCodeService;
	let cacheManager: jest.Mocked<Cache>;
	let jwtService: jest.Mocked<JwtService>;
	let deviceRegistrationService: jest.Mocked<DeviceRegistrationService>;
	let tokensService: jest.Mocked<TokensService>;
	let deviceRepository: jest.Mocked<Repository<Device>>;
	let userAuthRepository: jest.Mocked<Repository<UserAuth>>;

	// Test fixtures
	const mockDevice: Device = {
		id: 'device-123',
		userId: 'user-456',
		publicKey: 'mock-public-key',
		deviceName: 'iPhone 13',
		deviceType: 'mobile',
		deviceFingerprint: 'fingerprint-123',
		model: 'iPhone 13 Pro',
		osVersion: 'iOS 17.0',
		appVersion: '1.0.0',
		fcmToken: null,
		apnsToken: 'apns-token-123',
		lastActive: new Date('2026-01-09T10:00:00Z'),
		ipAddress: '192.168.1.1',
		isVerified: true,
		isActive: true,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-09T10:00:00Z'),
		user: null,
	} as Device;

	const mockUserAuth: UserAuth = {
		id: 'user-456',
		phoneNumber: '+33612345678',
		twoFactorSecret: null,
		twoFactorEnabled: false,
		lastAuthenticatedAt: new Date('2026-01-08T10:00:00Z'),
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-09T10:00:00Z'),
	};

	const mockFingerprint: DeviceFingerprint = {
		ipAddress: '192.168.1.1',
		userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
		deviceType: 'mobile',
		timestamp: Date.now(),
	};

	const mockTokenPair: TokenPair = {
		accessToken: 'mock-access-token',
		refreshToken: 'mock-refresh-token',
	};

	const mockCacheManager = {
		get: jest.fn(),
		set: jest.fn(),
		del: jest.fn(),
	};

	const mockJwtService = {
		sign: jest.fn(),
		verify: jest.fn(),
	};

	const mockDeviceRegistrationService = {
		registerDevice: jest.fn(),
	};

	const mockTokensService = {
		generateTokenPair: jest.fn(),
	};

	const mockDeviceRepository = {
		findOne: jest.fn(),
	};

	const mockUserAuthRepository = {
		findOne: jest.fn(),
		save: jest.fn(),
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				QuickResponseCodeService,
				{
					provide: CACHE_MANAGER,
					useValue: mockCacheManager,
				},
				{
					provide: JwtService,
					useValue: mockJwtService,
				},
				{
					provide: DeviceRegistrationService,
					useValue: mockDeviceRegistrationService,
				},
				{
					provide: TokensService,
					useValue: mockTokensService,
				},
				{
					provide: getRepositoryToken(Device),
					useValue: mockDeviceRepository,
				},
				{
					provide: getRepositoryToken(UserAuth),
					useValue: mockUserAuthRepository,
				},
			],
		}).compile();

		service = module.get<QuickResponseCodeService>(QuickResponseCodeService);
		cacheManager = module.get(CACHE_MANAGER);
		jwtService = module.get(JwtService);
		deviceRegistrationService = module.get(DeviceRegistrationService);
		tokensService = module.get(TokensService);
		deviceRepository = module.get(getRepositoryToken(Device));
		userAuthRepository = module.get(getRepositoryToken(UserAuth));
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getDevice', () => {
		describe('Cas Nominal', () => {
			it('should return device when device exists', async () => {
				deviceRepository.findOne.mockResolvedValue(mockDevice);

				const result = await service.getDevice('device-123');

				expect(result).toEqual(mockDevice);
				expect(deviceRepository.findOne).toHaveBeenCalledWith({
					where: { id: 'device-123' },
				});
			});
		});

		describe('Cas d\'Erreur', () => {
			it('should throw NotFoundException when device does not exist', async () => {
				deviceRepository.findOne.mockResolvedValue(null);

				await expect(service.getDevice('non-existent-device')).rejects.toThrow(
					new NotFoundException('Appareil non trouvé')
				);
			});
		});

		describe('Cas Limites', () => {
			it('should throw NotFoundException for null deviceId', async () => {
				deviceRepository.findOne.mockResolvedValue(null);

				await expect(service.getDevice(null as any)).rejects.toThrow(NotFoundException);
			});

			it('should throw NotFoundException for undefined deviceId', async () => {
				deviceRepository.findOne.mockResolvedValue(null);

				await expect(service.getDevice(undefined as any)).rejects.toThrow(NotFoundException);
			});
		});
	});

	describe('generateQRChallenge', () => {
		describe('Cas Nominal', () => {
			it('should generate a valid QR challenge for authenticated device', async () => {
				const mockJwt = 'mock-jwt-token';
				const now = 1704787200000; // Timestamp fixe
				jest.spyOn(Date, 'now').mockReturnValue(now);

				deviceRepository.findOne.mockResolvedValue(mockDevice);
				jwtService.sign.mockReturnValue(mockJwt);

				const result = await service.generateQRChallenge('device-123');

				expect(result).toBe(mockJwt);
				expect(jwtService.sign).toHaveBeenCalledWith(
					expect.objectContaining({
						challengeId: expect.any(String),
						deviceId: 'device-123',
						userId: 'user-456',
						exp: expect.any(Number),
					}),
					{ algorithm: 'ES256' }
				);
				expect(cacheManager.set).toHaveBeenCalledWith(
					expect.stringContaining('qr_challenge:'),
					expect.any(String),
					300000
				);

				jest.restoreAllMocks();
			});
		});

		describe('Cas d\'Erreur', () => {
			it('should throw NotFoundException when authenticated device does not exist', async () => {
				deviceRepository.findOne.mockResolvedValue(null);

				await expect(service.generateQRChallenge('non-existent-device')).rejects.toThrow(
					new NotFoundException('Appareil non trouvé')
				);
			});
		});

		describe('Validation du Format', () => {
			it('should generate JWT with correct structure', async () => {
				const now = 1704787200000;
				jest.spyOn(Date, 'now').mockReturnValue(now);

				const mockJwt = 'mock-jwt-token';
				deviceRepository.findOne.mockResolvedValue(mockDevice);
				jwtService.sign.mockReturnValue(mockJwt);

				await service.generateQRChallenge('device-123');

				const signCall = jwtService.sign.mock.calls[0][0];
				expect(signCall).toHaveProperty('challengeId');
				expect(signCall).toHaveProperty('deviceId', 'device-123');
				expect(signCall).toHaveProperty('userId', 'user-456');
				expect(signCall).toHaveProperty('exp');

				jest.restoreAllMocks();
			});

			it('should set correct expiration time in JWT', async () => {
				const now = 1704787200000;
				jest.spyOn(Date, 'now').mockReturnValue(now);

				const mockJwt = 'mock-jwt-token';
				deviceRepository.findOne.mockResolvedValue(mockDevice);
				jwtService.sign.mockReturnValue(mockJwt);

				await service.generateQRChallenge('device-123');

				const signCall = jwtService.sign.mock.calls[0][0];
				const expectedExp = Math.floor((now + 5 * 60 * 1000) / 1000);
				expect(signCall.exp).toBe(expectedExp);

				jest.restoreAllMocks();
			});
		});

		describe('Vérification du Cache', () => {
			it('should store challenge data in cache with correct TTL', async () => {
				const now = 1704787200000;
				jest.spyOn(Date, 'now').mockReturnValue(now);

				const mockJwt = 'mock-jwt-token';
				deviceRepository.findOne.mockResolvedValue(mockDevice);
				jwtService.sign.mockReturnValue(mockJwt);

				await service.generateQRChallenge('device-123');

				expect(cacheManager.set).toHaveBeenCalledWith(
					expect.stringContaining('qr_challenge:'),
					expect.any(String),
					300000 // 5 minutes en millisecondes
				);

				const cacheKey = cacheManager.set.mock.calls[0][0] as string;
				const cacheValue = JSON.parse(cacheManager.set.mock.calls[0][1] as string);

				expect(cacheKey).toMatch(/^qr_challenge:/);
				expect(cacheValue).toHaveProperty('userId', 'user-456');
				expect(cacheValue).toHaveProperty('deviceId', 'device-123');
				expect(cacheValue).toHaveProperty('publicKey', 'mock-public-key');
				expect(cacheValue).toHaveProperty('expiresAt');

				jest.restoreAllMocks();
			});
		});
	});

	describe('scanLogin', () => {
		const mockChallenge = 'mock-jwt-challenge';
		let mockChallengeData: QRChallengeData;

		beforeEach(() => {
			const now = 1704787200000;
			jest.spyOn(Date, 'now').mockReturnValue(now);
			mockChallengeData = {
				userId: 'user-456',
				deviceId: 'device-123',
				publicKey: 'mock-public-key',
				expiresAt: now + 5 * 60 * 1000,
			};
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe('Cas Nominal - Enregistrement Nouveau Appareil', () => {
			it('should register new device and return tokens when deviceName and deviceType provided', async () => {
				const dto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'device-123',
					deviceName: 'New iPhone',
					deviceType: 'mobile',
				};

				const newDevice = { ...mockDevice, id: 'new-device-456' };

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(mockChallengeData));
				deviceRegistrationService.registerDevice.mockResolvedValue(newDevice);
				userAuthRepository.findOne.mockResolvedValue(mockUserAuth);
				userAuthRepository.save.mockResolvedValue(mockUserAuth);
				tokensService.generateTokenPair.mockResolvedValue(mockTokenPair);

				const result = await service.scanLogin(dto, mockFingerprint);

				expect(deviceRegistrationService.registerDevice).toHaveBeenCalledWith({
					userId: 'user-456',
					deviceName: 'New iPhone',
					deviceType: 'mobile',
					publicKey: 'mock-public-key',
					ipAddress: '192.168.1.1',
				});
				expect(userAuthRepository.save).toHaveBeenCalled();
				expect(tokensService.generateTokenPair).toHaveBeenCalledWith(
					'user-456',
					'new-device-456',
					mockFingerprint
				);
				expect(result).toEqual(mockTokenPair);
			});
		});

		describe('Cas Nominal - Session Web', () => {
			it('should create web session when deviceName and deviceType not provided', async () => {
				const dto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'device-123',
				};

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(mockChallengeData));
				userAuthRepository.findOne.mockResolvedValue(mockUserAuth);
				userAuthRepository.save.mockResolvedValue(mockUserAuth);
				tokensService.generateTokenPair.mockResolvedValue(mockTokenPair);

				const result = await service.scanLogin(dto, mockFingerprint);

				expect(deviceRegistrationService.registerDevice).not.toHaveBeenCalled();
				expect(tokensService.generateTokenPair).toHaveBeenCalledWith(
					'user-456',
					'web-session',
					mockFingerprint
				);
				expect(result).toEqual(mockTokenPair);
			});
		});

		describe('Cas d\'Erreur - Challenge Invalide', () => {
			it('should throw BadRequestException when challenge is invalid', async () => {
				const dto: ScanLoginDto = {
					challenge: 'invalid-jwt',
					authenticatedDeviceId: 'device-123',
				};

				jwtService.verify.mockImplementation(() => {
					throw new Error('Invalid token');
				});

				await expect(service.scanLogin(dto, mockFingerprint)).rejects.toThrow(
					new BadRequestException('Challenge QR invalide')
				);
			});

			it('should throw BadRequestException when challenge is expired', async () => {
				const now = 1704787200000;
				jest.spyOn(Date, 'now').mockReturnValue(now);

				const dto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'device-123',
				};

				const expiredChallengeData: QRChallengeData = {
					userId: 'user-456',
					deviceId: 'device-123',
					publicKey: 'mock-public-key',
					expiresAt: now - 1000, // Expiré il y a 1 seconde
				};

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(expiredChallengeData));

				await expect(service.scanLogin(dto, mockFingerprint)).rejects.toThrow(
					new BadRequestException('Challenge QR expiré')
				);
				expect(cacheManager.del).toHaveBeenCalledWith('qr_challenge:challenge-789');
			});

			it('should throw ForbiddenException when authenticatedDeviceId does not match challenge', async () => {
				const dto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'different-device-id',
				};

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});

				await expect(service.scanLogin(dto, mockFingerprint)).rejects.toThrow(
					new ForbiddenException('Appareil non autorisé pour ce challenge')
				);
			});
		});

		describe('Mise à Jour de lastAuthenticatedAt', () => {
			it('should update user lastAuthenticatedAt timestamp', async () => {
				const dto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'device-123',
				};

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(mockChallengeData));
				userAuthRepository.findOne.mockResolvedValue(mockUserAuth);
				userAuthRepository.save.mockResolvedValue(mockUserAuth);
				tokensService.generateTokenPair.mockResolvedValue(mockTokenPair);

				await service.scanLogin(dto, mockFingerprint);

				expect(userAuthRepository.save).toHaveBeenCalledWith(
					expect.objectContaining({
						lastAuthenticatedAt: expect.any(Date),
					})
				);
			});

			it('should handle gracefully when user does not exist', async () => {
				const dto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'device-123',
				};

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(mockChallengeData));
				userAuthRepository.findOne.mockResolvedValue(null);
				tokensService.generateTokenPair.mockResolvedValue(mockTokenPair);

				const result = await service.scanLogin(dto, mockFingerprint);

				expect(userAuthRepository.save).not.toHaveBeenCalled();
				expect(result).toEqual(mockTokenPair);
			});
		});
	});

	describe('validateQRChallenge', () => {
		const mockChallenge = 'mock-jwt-challenge';
		let mockChallengeData: QRChallengeData;

		beforeEach(() => {
			const now = 1704787200000;
			jest.spyOn(Date, 'now').mockReturnValue(now);
			mockChallengeData = {
				userId: 'user-456',
				deviceId: 'device-123',
				publicKey: 'mock-public-key',
				expiresAt: now + 5 * 60 * 1000,
			};
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe('Cas Nominal', () => {
			it('should validate and return challenge data for valid challenge', async () => {
				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(mockChallengeData));

				const result = await service.validateQRChallenge(mockChallenge, 'device-123');

				expect(result).toEqual(mockChallengeData);
				expect(jwtService.verify).toHaveBeenCalledWith(mockChallenge, {
					algorithms: ['ES256'],
				});
				expect(cacheManager.get).toHaveBeenCalledWith('qr_challenge:challenge-789');
				expect(cacheManager.del).toHaveBeenCalledWith('qr_challenge:challenge-789');
			});
		});

		describe('Cas d\'Erreur - JWT Invalide', () => {
			it('should throw BadRequestException for invalid JWT signature', async () => {
				jwtService.verify.mockImplementation(() => {
					throw new Error('Invalid signature');
				});

				await expect(
					service.validateQRChallenge('invalid-jwt', 'device-123')
				).rejects.toThrow(new BadRequestException('Challenge QR invalide'));
			});

			it('should throw BadRequestException for malformed JWT', async () => {
				jwtService.verify.mockImplementation(() => {
					throw new Error('Malformed token');
				});

				await expect(
					service.validateQRChallenge('not-a-jwt', 'device-123')
				).rejects.toThrow(new BadRequestException('Challenge QR invalide'));
			});
		});

		describe('Cas d\'Erreur - Device Mismatch', () => {
			it('should throw ForbiddenException when authenticatedDeviceId does not match', async () => {
				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});

				await expect(
					service.validateQRChallenge(mockChallenge, 'different-device-id')
				).rejects.toThrow(new ForbiddenException('Appareil non autorisé pour ce challenge'));
			});
		});

		describe('Cas d\'Erreur - Challenge Expiré ou Absent', () => {
			it('should throw BadRequestException when challenge not found in cache', async () => {
				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(null);

				await expect(
					service.validateQRChallenge(mockChallenge, 'device-123')
				).rejects.toThrow(new BadRequestException('Challenge QR expiré ou invalide'));
			});

			it('should throw BadRequestException when challenge data is expired', async () => {
				const now = 1704787200000;
				jest.spyOn(Date, 'now').mockReturnValue(now);

				const expiredChallengeData: QRChallengeData = {
					userId: 'user-456',
					deviceId: 'device-123',
					publicKey: 'mock-public-key',
					expiresAt: now - 1000, // Expiré il y a 1 seconde
				};

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(expiredChallengeData));

				await expect(
					service.validateQRChallenge(mockChallenge, 'device-123')
				).rejects.toThrow(new BadRequestException('Challenge QR expiré'));
				expect(cacheManager.del).toHaveBeenCalledWith('qr_challenge:challenge-789');
			});
		});

		describe('Usage Unique', () => {
			it('should remove challenge from cache after successful validation', async () => {
				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(mockChallengeData));

				await service.validateQRChallenge(mockChallenge, 'device-123');

				expect(cacheManager.del).toHaveBeenCalledWith('qr_challenge:challenge-789');
			});

			it('should not allow challenge reuse', async () => {
				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				// Première utilisation: succès
				cacheManager.get.mockResolvedValueOnce(JSON.stringify(mockChallengeData));
				// Deuxième utilisation: challenge n'existe plus
				cacheManager.get.mockResolvedValueOnce(null);

				// Premier appel réussit
				await service.validateQRChallenge(mockChallenge, 'device-123');

				// Deuxième appel échoue
				await expect(
					service.validateQRChallenge(mockChallenge, 'device-123')
				).rejects.toThrow(new BadRequestException('Challenge QR expiré ou invalide'));
			});
		});
	});

	describe('Tests d\'Intégration entre Méthodes', () => {
		describe('Flow Complet', () => {
			it('should complete full QR login flow successfully', async () => {
				const now = 1704787200000;
				jest.spyOn(Date, 'now').mockReturnValue(now);

				// Étape 1: Génération du challenge
				deviceRepository.findOne.mockResolvedValue(mockDevice);
				const mockJwt = 'mock-jwt-token';
				jwtService.sign.mockReturnValue(mockJwt);

				const challenge = await service.generateQRChallenge('device-123');
				expect(challenge).toBe(mockJwt);

				// Étape 2: Validation du challenge
				const challengeId = 'challenge-789';
				const flowChallengeData: QRChallengeData = {
					userId: 'user-456',
					deviceId: 'device-123',
					publicKey: 'mock-public-key',
					expiresAt: now + 5 * 60 * 1000,
				};

				jwtService.verify.mockReturnValue({
					challengeId,
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(flowChallengeData));

				const validatedData = await service.validateQRChallenge(mockJwt, 'device-123');
				expect(validatedData).toEqual(flowChallengeData);

				// Étape 3: Login avec scanLogin
				const dto: ScanLoginDto = {
					challenge: mockJwt,
					authenticatedDeviceId: 'device-123',
				};

				// Réinitialiser les mocks pour scanLogin
				jwtService.verify.mockReturnValue({
					challengeId,
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(flowChallengeData));
				userAuthRepository.findOne.mockResolvedValue(mockUserAuth);
				userAuthRepository.save.mockResolvedValue(mockUserAuth);
				tokensService.generateTokenPair.mockResolvedValue(mockTokenPair);

				const result = await service.scanLogin(dto, mockFingerprint);
				expect(result).toEqual(mockTokenPair);

				jest.restoreAllMocks();
			});
		});

		describe('Expiration', () => {
			it('should reject expired challenge in scanLogin after 5 minutes', async () => {
				const now = 1704787200000;
				jest.spyOn(Date, 'now').mockReturnValue(now);

				const expiredTime = now - 5 * 60 * 1000 - 1000; // 5 minutes + 1 seconde dans le passé

				const expiredChallengeData: QRChallengeData = {
					userId: 'user-456',
					deviceId: 'device-123',
					publicKey: 'mock-public-key',
					expiresAt: expiredTime,
				};

				const dto: ScanLoginDto = {
					challenge: 'expired-challenge',
					authenticatedDeviceId: 'device-123',
				};

				jwtService.verify.mockReturnValue({
					challengeId: 'challenge-789',
					deviceId: 'device-123',
					userId: 'user-456',
				});
				cacheManager.get.mockResolvedValue(JSON.stringify(expiredChallengeData));

				await expect(service.scanLogin(dto, mockFingerprint)).rejects.toThrow(
					new BadRequestException('Challenge QR expiré')
				);
				expect(cacheManager.del).toHaveBeenCalledWith('qr_challenge:challenge-789');

				jest.restoreAllMocks();
			});
		});
	});
});
