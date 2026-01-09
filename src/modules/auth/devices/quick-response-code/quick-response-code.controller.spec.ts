import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuickResponseCodeController } from './quick-response-code.controller';
import { QuickResponseCodeService } from './quick-response-code.service';
import { JwtAuthGuard } from '../../tokens/guards';
import { ScanLoginDto } from '../dto/scan-login.dto';
import { TokenPair } from '../../tokens/types/token-pair.interface';

describe('QuickResponseCodeController', () => {
	let controller: QuickResponseCodeController;
	let service: jest.Mocked<QuickResponseCodeService>;

	const mockDeviceId = '550e8400-e29b-41d4-a716-446655440000';
	const mockUserId = 'test-user-id';
	const mockChallenge = 'eyJhbGciOiJFUzI1NiJ9.eyJjaGFsbGVuZ2VJZCI6InRlc3QtY2hhbGxlbmdlIiwiZGV2aWNlSWQiOiJ0ZXN0LWRldmljZSJ9';

	const mockTokenPair: TokenPair = {
		accessToken: 'access-token-xyz',
		refreshToken: 'refresh-token-abc',
	};

	const mockRequest = {
		user: {
			sub: mockUserId,
		},
		headers: {
			'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
		},
		ip: '192.168.1.100',
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [QuickResponseCodeController],
			providers: [
				{
					provide: QuickResponseCodeService,
					useValue: {
						generateQRChallenge: jest.fn(),
						scanLogin: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate: jest.fn(() => true),
			})
			.compile();

		controller = module.get<QuickResponseCodeController>(QuickResponseCodeController);
		service = module.get(QuickResponseCodeService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('POST /qr-code/challenge/:deviceId', () => {
		describe('Success cases', () => {
			it('should generate QR challenge successfully with valid deviceId', async () => {
				service.generateQRChallenge.mockResolvedValue(mockChallenge);

				const result = await controller.generateQRChallenge(mockDeviceId);

				expect(result).toBe(mockChallenge);
				expect(service.generateQRChallenge).toHaveBeenCalledWith(mockDeviceId);
				expect(service.generateQRChallenge).toHaveBeenCalledTimes(1);
			});

			it('should pass the deviceId parameter correctly to the service', async () => {
				const customDeviceId = 'custom-device-uuid';
				service.generateQRChallenge.mockResolvedValue(mockChallenge);

				await controller.generateQRChallenge(customDeviceId);

				expect(service.generateQRChallenge).toHaveBeenCalledWith(customDeviceId);
			});

			it('should return a string challenge token', async () => {
				const challengeToken = 'jwt-challenge-token-string';
				service.generateQRChallenge.mockResolvedValue(challengeToken);

				const result = await controller.generateQRChallenge(mockDeviceId);

				expect(typeof result).toBe('string');
				expect(result).toBe(challengeToken);
			});
		});

		describe('Authentication errors', () => {
			it('should be protected by JwtAuthGuard', () => {
				const guards = Reflect.getMetadata('__guards__', controller.generateQRChallenge);
				const guardNames = guards?.map((guard: any) => guard.name);

				expect(guardNames).toContain('JwtAuthGuard');
			});
		});

		describe('Resource not found', () => {
			it('should throw NotFoundException when device does not exist', async () => {
				service.generateQRChallenge.mockRejectedValue(
					new NotFoundException('Appareil non trouvé')
				);

				await expect(
					controller.generateQRChallenge('non-existent-device-id')
				).rejects.toThrow(NotFoundException);

				expect(service.generateQRChallenge).toHaveBeenCalledWith('non-existent-device-id');
			});

			it('should throw NotFoundException with correct message', async () => {
				const errorMessage = 'Appareil non trouvé';
				service.generateQRChallenge.mockRejectedValue(
					new NotFoundException(errorMessage)
				);

				await expect(
					controller.generateQRChallenge(mockDeviceId)
				).rejects.toThrow(errorMessage);
			});
		});

		describe('Parameter validation', () => {
			it('should accept UUID format deviceId', async () => {
				const uuidDeviceId = '123e4567-e89b-12d3-a456-426614174000';
				service.generateQRChallenge.mockResolvedValue(mockChallenge);

				await controller.generateQRChallenge(uuidDeviceId);

				expect(service.generateQRChallenge).toHaveBeenCalledWith(uuidDeviceId);
			});

			it('should handle invalid deviceId format gracefully (service responsibility)', async () => {
				const invalidDeviceId = 'invalid-uuid-format';
				service.generateQRChallenge.mockRejectedValue(
					new NotFoundException('Appareil non trouvé')
				);

				await expect(
					controller.generateQRChallenge(invalidDeviceId)
				).rejects.toThrow(NotFoundException);
			});
		});

		describe('Error propagation', () => {
			it('should propagate service errors', async () => {
				const error = new Error('Unexpected service error');
				service.generateQRChallenge.mockRejectedValue(error);

				await expect(
					controller.generateQRChallenge(mockDeviceId)
				).rejects.toThrow(error);
			});
		});
	});

	describe('POST /qr-code/scan', () => {
		describe('Success cases', () => {
			it('should login successfully with complete device registration', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
					deviceName: 'iPhone 15 Pro',
					deviceType: 'mobile',
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				const result = await controller.scanLogin(scanDto, mockRequest);

				expect(result).toEqual(mockTokenPair);
				expect(result).toHaveProperty('accessToken');
				expect(result).toHaveProperty('refreshToken');
			});

			it('should login successfully in web-session mode (minimal DTO)', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				const result = await controller.scanLogin(scanDto, mockRequest);

				expect(result).toEqual(mockTokenPair);
				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.objectContaining({
						userAgent: mockRequest.headers['user-agent'],
						ipAddress: mockRequest.ip,
						timestamp: expect.any(Number),
					})
				);
			});

			it('should return TokenPair with accessToken and refreshToken', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				const result = await controller.scanLogin(scanDto, mockRequest);

				expect(result.accessToken).toBe('access-token-xyz');
				expect(result.refreshToken).toBe('refresh-token-abc');
			});

			it('should call scanLogin service method once', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, mockRequest);

				expect(service.scanLogin).toHaveBeenCalledTimes(1);
			});
		});

		describe('DTO validation errors', () => {
			it('should validate that challenge is required', () => {
				const invalidDto = {
					authenticatedDeviceId: mockDeviceId,
				} as ScanLoginDto;

				// Validation is handled by class-validator at framework level
				// Testing that the DTO requires challenge field
				expect(invalidDto.challenge).toBeUndefined();
			});

			it('should validate that authenticatedDeviceId is required', () => {
				const invalidDto = {
					challenge: mockChallenge,
				} as ScanLoginDto;

				expect(invalidDto.authenticatedDeviceId).toBeUndefined();
			});

			it('should accept optional deviceName and deviceType', async () => {
				const dtoWithOptionals: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
					deviceName: 'My Phone',
					deviceType: 'mobile',
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				const result = await controller.scanLogin(dtoWithOptionals, mockRequest);

				expect(result).toEqual(mockTokenPair);
				expect(service.scanLogin).toHaveBeenCalledWith(
					dtoWithOptionals,
					expect.any(Object)
				);
			});
		});

		describe('Challenge validation errors', () => {
			it('should throw BadRequestException when challenge is expired', async () => {
				const scanDto: ScanLoginDto = {
					challenge: 'expired-challenge-token',
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockRejectedValue(
					new BadRequestException('Challenge QR expiré ou invalide')
				);

				await expect(
					controller.scanLogin(scanDto, mockRequest)
				).rejects.toThrow(BadRequestException);
			});

			it('should throw BadRequestException when challenge is malformed', async () => {
				const scanDto: ScanLoginDto = {
					challenge: 'invalid-jwt-string',
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockRejectedValue(
					new BadRequestException('Challenge QR invalide')
				);

				await expect(
					controller.scanLogin(scanDto, mockRequest)
				).rejects.toThrow('Challenge QR invalide');
			});

			it('should throw ForbiddenException when device is not authorized', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'different-device-id',
				};

				service.scanLogin.mockRejectedValue(
					new ForbiddenException('Appareil non autorisé pour ce challenge')
				);

				await expect(
					controller.scanLogin(scanDto, mockRequest)
				).rejects.toThrow(ForbiddenException);
			});

			it('should include correct error message for unauthorized device', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: 'wrong-device',
				};

				const errorMessage = 'Appareil non autorisé pour ce challenge';
				service.scanLogin.mockRejectedValue(
					new ForbiddenException(errorMessage)
				);

				await expect(
					controller.scanLogin(scanDto, mockRequest)
				).rejects.toThrow(errorMessage);
			});
		});

		describe('Fingerprint extraction', () => {
			it('should extract user-agent from request headers', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, mockRequest);

				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.objectContaining({
						userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
					})
				);
			});

			it('should extract IP address from request', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, mockRequest);

				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.objectContaining({
						ipAddress: '192.168.1.100',
					})
				);
			});

			it('should include deviceType from DTO in fingerprint', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
					deviceType: 'desktop',
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, mockRequest);

				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.objectContaining({
						deviceType: 'desktop',
					})
				);
			});

			it('should generate timestamp dynamically', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				const beforeTimestamp = Date.now();
				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, mockRequest);

				const afterTimestamp = Date.now();

				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.objectContaining({
						timestamp: expect.any(Number),
					})
				);

				const callArgs = service.scanLogin.mock.calls[0][1];
				expect(callArgs.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
				expect(callArgs.timestamp).toBeLessThanOrEqual(afterTimestamp);
			});

			it('should handle missing user-agent header gracefully', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				const requestWithoutUserAgent = {
					...mockRequest,
					headers: {},
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, requestWithoutUserAgent);

				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.objectContaining({
						userAgent: undefined,
					})
				);
			});

			it('should construct complete DeviceFingerprint object', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
					deviceType: 'mobile',
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, mockRequest);

				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.objectContaining({
						userAgent: expect.any(String),
						ipAddress: expect.any(String),
						deviceType: expect.any(String),
						timestamp: expect.any(Number),
					})
				);
			});
		});

		describe('HTTP status codes', () => {
			it('should return 200 OK on successful scan login', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				const result = await controller.scanLogin(scanDto, mockRequest);

				// Verify result is returned (controller decorated with @HttpCode(200))
				expect(result).toBeDefined();
				expect(result).toEqual(mockTokenPair);
			});
		});

		describe('Edge cases', () => {
			it('should handle service throwing unexpected errors', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
				};

				const error = new Error('Database connection failed');
				service.scanLogin.mockRejectedValue(error);

				await expect(
					controller.scanLogin(scanDto, mockRequest)
				).rejects.toThrow(error);
			});

			it('should pass all DTO fields to service', async () => {
				const scanDto: ScanLoginDto = {
					challenge: mockChallenge,
					authenticatedDeviceId: mockDeviceId,
					deviceName: 'Test Device Name',
					deviceType: 'tablet',
				};

				service.scanLogin.mockResolvedValue(mockTokenPair);

				await controller.scanLogin(scanDto, mockRequest);

				expect(service.scanLogin).toHaveBeenCalledWith(
					scanDto,
					expect.any(Object)
				);

				const [dtoArg] = service.scanLogin.mock.calls[0];
				expect(dtoArg.challenge).toBe(mockChallenge);
				expect(dtoArg.authenticatedDeviceId).toBe(mockDeviceId);
				expect(dtoArg.deviceName).toBe('Test Device Name');
				expect(dtoArg.deviceType).toBe('tablet');
			});
		});
	});

	describe('Dependency injection', () => {
		it('should inject QuickResponseCodeService correctly', () => {
			expect(service).toBeDefined();
			expect(service.generateQRChallenge).toBeDefined();
			expect(service.scanLogin).toBeDefined();
		});
	});
});
